import * as vscode from "vscode";

type FencedCodeBlock = {
  language: string;
  startLine: number;
  endLine: number;
};

const JULIA_EXTENSION_IDS = [
  "ntluong95.positron-julia",
  "julialang.language-julia",
];

function parseFenceLanguage(info: string): string | null {
  const trimmed = info.trim();
  if (!trimmed) return null;

  // Quarto format: ```{julia, ...}
  const quartoMatch = /^\{\s*([A-Za-z0-9_.+-]+)/.exec(trimmed);
  if (quartoMatch?.[1]) {
    const lang = quartoMatch[1].toLowerCase();
    return lang === "jl" ? "julia" : lang;
  }

  // Standard markdown format: ```julia
  const markdownMatch = /^([A-Za-z0-9_.+-]+)/.exec(trimmed);
  if (markdownMatch?.[1]) {
    const lang = markdownMatch[1].toLowerCase();
    return lang === "jl" ? "julia" : lang;
  }

  return null;
}

function parseFenceStart(lineText: string): { marker: string; markerLength: number; language: string } | null {
  const match = /^\s*(`{3,}|~{3,})\s*(.*)$/.exec(lineText);
  if (!match) return null;

  const marker = match[1];
  const info = (match[2] || "").trim();
  if (!info) return null;

  const language = parseFenceLanguage(info);
  if (!language) return null;

  return {
    marker: marker[0],
    markerLength: marker.length,
    language,
  };
}

function isFenceEnd(lineText: string, marker: string, markerLength: number): boolean {
  const match = /^\s*(`{3,}|~{3,})\s*$/.exec(lineText);
  return !!match && match[1][0] === marker && match[1].length >= markerLength;
}

function isAnyFenceEnd(lineText: string): boolean {
  return /^\s*(`{3,}|~{3,})\s*$/.test(lineText);
}

function findEnclosingFencedBlock(document: vscode.TextDocument, line: number): FencedCodeBlock | null {
  let startLine = -1;
  let startMeta: ReturnType<typeof parseFenceStart> = null;

  for (let i = line; i >= 0; i--) {
    const text = document.lineAt(i).text;
    const start = parseFenceStart(text);
    if (start) {
      startLine = i;
      startMeta = start;
      break;
    }

    // We crossed a closing fence before finding an opening fence.
    if (isAnyFenceEnd(text)) {
      return null;
    }
  }

  if (startLine < 0 || !startMeta) return null;

  let endLine = -1;
  for (let i = startLine + 1; i < document.lineCount; i++) {
    if (isFenceEnd(document.lineAt(i).text, startMeta.marker, startMeta.markerLength)) {
      endLine = i;
      break;
    }
  }

  if (endLine < 0) return null;
  if (line <= startLine || line >= endLine) return null;

  return {
    language: startMeta.language,
    startLine,
    endLine,
  };
}

function getExecutionCode(editor: vscode.TextEditor): string {
  if (!editor.selection.isEmpty) {
    return editor.document.getText(editor.selection);
  }

  const line = editor.selection.active.line;
  return editor.document.lineAt(line).text;
}

function moveCursorDown(editor: vscode.TextEditor): void {
  const nextLine = Math.min(editor.selection.active.line + 1, editor.document.lineCount - 1);
  const pos = new vscode.Position(nextLine, 0);
  editor.selection = new vscode.Selection(pos, pos);
}

async function activateJuliaExtensionIfPresent(): Promise<void> {
  for (const extensionId of JULIA_EXTENSION_IDS) {
    const ext = vscode.extensions.getExtension(extensionId);
    if (ext && !ext.isActive) {
      try {
        await ext.activate();
      } catch {
        // Ignore and continue; runtime discovery below is authoritative.
      }
    }
  }
}

function tryRequirePositron(): any | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("positron");
  } catch {
    return undefined;
  }
}

async function getJuliaRuntime(positron: any): Promise<any | null> {
  const runtimes = await positron.runtime.getRegisteredRuntimes();
  const juliaRuntimes = Array.isArray(runtimes)
    ? runtimes.filter((runtime: any) => runtime?.languageId === "julia")
    : [];

  if (juliaRuntimes.length === 0) return null;

  try {
    const preferred = await positron.runtime.getPreferredRuntime("julia");
    if (preferred?.languageId === "julia") {
      return preferred;
    }
  } catch {
    // Fall back to first discovered Julia runtime.
  }

  return juliaRuntimes[0];
}

async function ensureJuliaSession(positron: any, runtime: any): Promise<void> {
  try {
    const activeSessions = await positron.runtime.getActiveSessions();
    const hasJuliaSession = Array.isArray(activeSessions) &&
      activeSessions.some((session: any) => session?.runtimeMetadata?.languageId === "julia");

    if (!hasJuliaSession && runtime?.runtimeId) {
      await positron.runtime.selectLanguageRuntime(runtime.runtimeId);
    }
  } catch {
    // executeCode can still start runtime in some environments.
  }
}

export function registerRunCurrentCompat(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("quarto-wingman.runCurrentCompat", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "quarto") {
        await vscode.commands.executeCommand("quarto.runCurrent");
        return;
      }

      const activeLine = editor.selection.active.line;
      const block = findEnclosingFencedBlock(editor.document, activeLine);
      if (!block || block.language !== "julia") {
        await vscode.commands.executeCommand("quarto.runCurrent");
        return;
      }

      const code = getExecutionCode(editor);
      if (!code.trim()) {
        moveCursorDown(editor);
        return;
      }

      // Let Quarto handle cell option lines (`#|`) in case settings/magic parsing is needed.
      if (editor.selection.isEmpty && /^\s*#\s*\|/.test(code)) {
        await vscode.commands.executeCommand("quarto.runCurrent");
        return;
      }

      const positron = tryRequirePositron();
      if (!positron?.runtime) {
        await vscode.commands.executeCommand("quarto.runCurrent");
        return;
      }

      await activateJuliaExtensionIfPresent();

      const juliaRuntime = await getJuliaRuntime(positron);
      if (!juliaRuntime) {
        vscode.window.showErrorMessage(
          "Julia runtime/kernel was not found. Start Julia in Positron first, then run the cell again."
        );
        return;
      }

      try {
        await ensureJuliaSession(positron, juliaRuntime);
        const mode = positron.RuntimeCodeExecutionMode?.Interactive;
        await positron.runtime.executeCode("julia", code, false, true, mode);

        if (editor.selection.isEmpty) {
          moveCursorDown(editor);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Julia execution failed: ${message}`);
      }
    })
  );
}
