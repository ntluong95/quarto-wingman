import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { isMap, isPair, isScalar, Node, Pair, parseDocument, Scalar } from "yaml";

const DIAGNOSTIC_SOURCE = "Quarto Wingman";
const PROJECT_YAML_NAMES = ["_quarto.yml", "_quarto.yaml"];
const DEBOUNCE_MS = 300;

interface FrontMatter {
  text: string;
  startLine: number;
}

let diagnosticCollection: vscode.DiagnosticCollection;
const pendingUpdates = new Map<string, NodeJS.Timeout>();

export function registerProjectYamlDiagnostics(
  context: vscode.ExtensionContext
): void {
  diagnosticCollection = vscode.languages.createDiagnosticCollection(
    "quarto-wingman.projectYaml"
  );
  context.subscriptions.push(diagnosticCollection);

  vscode.workspace.textDocuments.forEach((doc) => scheduleUpdate(doc, 0));

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => scheduleUpdate(doc, 0)),
    vscode.workspace.onDidChangeTextDocument((e) => scheduleUpdate(e.document)),
    vscode.workspace.onDidSaveTextDocument((doc) => scheduleUpdate(doc, 0)),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
      const key = doc.uri.toString();
      const timer = pendingUpdates.get(key);
      if (timer) {
        clearTimeout(timer);
        pendingUpdates.delete(key);
      }
    })
  );

  const watcher = vscode.workspace.createFileSystemWatcher(
    `**/_quarto.{yml,yaml}`
  );
  const refreshAll = () =>
    vscode.workspace.textDocuments.forEach((doc) => scheduleUpdate(doc, 0));
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(refreshAll),
    watcher.onDidCreate(refreshAll),
    watcher.onDidDelete(refreshAll)
  );
}

function scheduleUpdate(
  document: vscode.TextDocument,
  delay = DEBOUNCE_MS
): void {
  if (document.languageId !== "quarto") {
    return;
  }
  const key = document.uri.toString();
  const existing = pendingUpdates.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  pendingUpdates.set(
    key,
    setTimeout(() => {
      pendingUpdates.delete(key);
      try {
        updateDiagnostics(document);
      } catch {
        // Swallow errors to avoid breaking the editor; clear any stale diagnostics.
        diagnosticCollection.set(document.uri, []);
      }
    }, delay)
  );
}

function updateDiagnostics(document: vscode.TextDocument): void {
  if (document.isClosed || document.languageId !== "quarto") {
    return;
  }
  if (document.uri.scheme !== "file") {
    diagnosticCollection.set(document.uri, []);
    return;
  }

  const projectYamlPath = findProjectYaml(document.uri.fsPath);
  if (!projectYamlPath) {
    diagnosticCollection.set(document.uri, []);
    return;
  }

  const frontMatter = extractFrontMatter(document.getText());
  if (!frontMatter) {
    diagnosticCollection.set(document.uri, []);
    return;
  }

  let projectYamlText: string;
  try {
    projectYamlText = fs.readFileSync(projectYamlPath, "utf8");
  } catch {
    diagnosticCollection.set(document.uri, []);
    return;
  }

  let docTree;
  let projectTree;
  try {
    docTree = parseDocument(frontMatter.text);
    projectTree = parseDocument(projectYamlText);
  } catch {
    diagnosticCollection.set(document.uri, []);
    return;
  }

  if (
    docTree.errors.length > 0 ||
    projectTree.errors.length > 0 ||
    !docTree.contents ||
    !projectTree.contents
  ) {
    diagnosticCollection.set(document.uri, []);
    return;
  }

  const docJs = docTree.toJS({ maxAliasCount: -1 });
  const projectJs = projectTree.toJS({ maxAliasCount: -1 });
  const diagnostics: vscode.Diagnostic[] = [];
  const projectRelPath = vscode.workspace.asRelativePath(projectYamlPath);

  compareValues(
    docTree.contents as Node,
    docJs,
    projectJs,
    frontMatter,
    document,
    projectRelPath,
    diagnostics,
    []
  );

  diagnosticCollection.set(document.uri, diagnostics);
}

function compareValues(
  docRoot: Node,
  docValue: unknown,
  projectValue: unknown,
  frontMatter: FrontMatter,
  document: vscode.TextDocument,
  projectRelPath: string,
  diagnostics: vscode.Diagnostic[],
  pathParts: string[]
): void {
  if (!isPlainObject(docValue) || !isPlainObject(projectValue)) {
    return;
  }
  for (const key of Object.keys(docValue)) {
    if (!Object.prototype.hasOwnProperty.call(projectValue, key)) {
      continue;
    }
    const currentPath = [...pathParts, key];
    const docChild = (docValue as Record<string, unknown>)[key];
    const projectChild = (projectValue as Record<string, unknown>)[key];

    if (isPlainObject(docChild) && isPlainObject(projectChild)) {
      compareValues(
        docRoot,
        docChild,
        projectChild,
        frontMatter,
        document,
        projectRelPath,
        diagnostics,
        currentPath
      );
      continue;
    }

    const keyRange = findKeyRange(docRoot, currentPath);
    if (!keyRange) {
      continue;
    }

    const startPos = offsetToPosition(
      frontMatter.text,
      keyRange[0],
      frontMatter.startLine
    );
    if (startPos.line >= document.lineCount) {
      continue;
    }
    const range = new vscode.Range(
      startPos,
      document.lineAt(startPos.line).range.end
    );

    const pathDisplay = currentPath.join(".");
    const equal = deepEqual(docChild, projectChild);
    const diagnostic = equal
      ? buildDuplicateDiagnostic(range, pathDisplay, projectRelPath)
      : buildOverrideDiagnostic(
          range,
          pathDisplay,
          projectRelPath,
          projectChild,
          docChild
        );
    diagnostics.push(diagnostic);
  }
}

function buildDuplicateDiagnostic(
  range: vscode.Range,
  pathDisplay: string,
  projectRelPath: string
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    range,
    `'${pathDisplay}' duplicates the project setting in ${projectRelPath} — you can remove it.`,
    vscode.DiagnosticSeverity.Hint
  );
  diagnostic.source = DIAGNOSTIC_SOURCE;
  diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
  return diagnostic;
}

function buildOverrideDiagnostic(
  range: vscode.Range,
  pathDisplay: string,
  projectRelPath: string,
  projectValue: unknown,
  docValue: unknown
): vscode.Diagnostic {
  const projectDisplay = formatValue(projectValue);
  const docDisplay = formatValue(docValue);
  const diagnostic = new vscode.Diagnostic(
    range,
    `'${pathDisplay}' overrides the project setting in ${projectRelPath} (project: ${projectDisplay} → document: ${docDisplay}).`,
    vscode.DiagnosticSeverity.Information
  );
  diagnostic.source = DIAGNOSTIC_SOURCE;
  return diagnostic;
}

function findKeyRange(
  root: Node | null,
  pathParts: string[]
): [number, number] | null {
  let node: unknown = root;
  for (let i = 0; i < pathParts.length; i++) {
    if (!isMap(node)) {
      return null;
    }
    const pair = node.items.find(
      (item): item is Pair =>
        isPair(item) &&
        isScalar(item.key) &&
        String((item.key as Scalar).value) === pathParts[i]
    );
    if (!pair) {
      return null;
    }
    if (i === pathParts.length - 1) {
      const keyNode = pair.key as Scalar;
      if (keyNode.range) {
        return [keyNode.range[0], keyNode.range[1]];
      }
      return null;
    }
    node = pair.value;
  }
  return null;
}

function extractFrontMatter(text: string): FrontMatter | null {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return null;
  }
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "---" || trimmed === "...") {
      endLine = i;
      break;
    }
  }
  if (endLine === -1) {
    return null;
  }
  return {
    text: lines.slice(1, endLine).join("\n"),
    startLine: 1,
  };
}

function findProjectYaml(documentPath: string): string | null {
  let dir = path.dirname(documentPath);
  while (true) {
    for (const name of PROJECT_YAML_NAMES) {
      const candidate = path.join(dir, name);
      try {
        if (
          fs.existsSync(candidate) &&
          path.resolve(candidate) !== path.resolve(documentPath)
        ) {
          return candidate;
        }
      } catch {
        // ignore stat errors and keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function offsetToPosition(
  text: string,
  offset: number,
  baseLine: number
): vscode.Position {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < clamped; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line++;
      lineStart = i + 1;
    }
  }
  return new vscode.Position(baseLine + line, clamped - lineStart);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        return false;
      }
      if (!deepEqual(a[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    const json = JSON.stringify(value);
    if (json && json.length <= 80) {
      return json;
    }
    return json ? json.slice(0, 77) + "..." : String(value);
  } catch {
    return String(value);
  }
}
