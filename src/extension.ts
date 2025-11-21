import * as vscode from "vscode";
import { wingmanCodeLensProvider } from "./codelens";
import { registerCellOptionsCommands } from "./cell-configuration";
import { registerInlineRepl } from "./repl";
import { registerCellOptionHoverProvider } from "./hoverProvider";
import { insertCitation } from "./zotero";
import * as fs from "fs";
import * as path from "path";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { rangesByType } from "./rangesByType";
// --- inline debounce (no just-debounce) ---
function debounce<F extends (...args: any[]) => void>(fn: F, ms: number): F {
  let timer: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as F;
}

let client: LanguageClient | null = null;
const styles = new Map<string, vscode.TextEditorDecorationType>();
let colorIndex = 0;

// Pull settings once
const config = vscode.workspace.getConfiguration("semantic-highlighting");
const colors: string[] = config.get("colors") as string[];

export async function activate(context: vscode.ExtensionContext) {
  // 1) Locate Positron’s bundled LSP on Windows; else use CLI
  const bundled = path.join(
    "C:\\Program Files\\Positron\\resources\\app\\extensions",
    "positron-python",
    "python_files",
    "posit",
    "positron_jedilsp.py"
  );

  const serverOpts: ServerOptions =
    process.platform === "win32" && fs.existsSync(bundled)
      ? { command: "python", args: [bundled] }
      : { command: "jedi-language-server", args: [] };

  // 2) Start the LanguageClient for Quarto
  const clientOpts: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "quarto" }],
  };
  client = new LanguageClient(
    "quartoWingmanJedi",
    "Quarto Wingman Jedi LSP",
    serverOpts,
    clientOpts,
    /* autoRestart */ false
  );
  context.subscriptions.push(client.start());
  await client.onReady();

  // 3) Register semantic-tokens provider so VS Code will call us for .qmd
  const cap = client.initializeResult?.capabilities.semanticTokensProvider;
  if (cap?.legend) {
    const vsLegend = new vscode.SemanticTokensLegend(
      cap.legend.tokenTypes,
      cap.legend.tokenModifiers
    );
    vscode.languages.registerDocumentSemanticTokensProvider(
      { scheme: "file", language: "quarto" },
      client as unknown as vscode.DocumentSemanticTokensProvider,
      vsLegend
    );
  }

  // 4) Hook editor/document events with debounce
  const update = debounce(highlightModuleAndClass, 200);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => update()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        update();
      }
    })
  );

  // 5) Initial run
  highlightModuleAndClass();

  // Register the command for configuring cell options.
  registerCellOptionsCommands(context);

  // Register the CodeLens provider for Quarto documents.
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "quarto" },
      wingmanCodeLensProvider()
    )
  );

  // Register the hover provider for cell options.
  registerCellOptionHoverProvider(context);

  // Register inline REPL support.
  registerInlineRepl(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "zoteroForQuarto.pickCitation",
      insertCitation
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("zoteroForQuarto.pickCitation.ui", () =>
      vscode.commands.executeCommand("zoteroForQuarto.pickCitation")
    )
  );
}

export function deactivate(): Thenable<void> | undefined {
  // dispose all decorations
  for (const d of styles.values()) {
    d.dispose();
  }
  return client?.stop();
}

// Core highlighting logic:
async function highlightModuleAndClass() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "quarto") {
    // clear if not in a Quarto file
    for (const d of styles.values()) d.dispose();
    styles.clear();
    return;
  }

  // 1) fetch legend & tokens
  const uri = editor.document.uri;
  const legend =
    await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
      "vscode.provideDocumentSemanticTokensLegend",
      uri
    );
  const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
    "vscode.provideDocumentSemanticTokens",
    uri
  );
  if (!legend || !tokens) {
    return;
  }

  // 2) extract only module/class ranges
  const byType = rangesByType(tokens, legend, editor);

  // 3) apply decorations
  const seen = new Set<string>();
  for (const [type, map] of byType) {
    for (const [name, ranges] of map) {
      const key = `${type}:${name}`;
      seen.add(key);
      if (!styles.has(key)) {
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        styles.set(
          key,
          vscode.window.createTextEditorDecorationType({ color })
        );
      }
      editor.setDecorations(styles.get(key)!, ranges);
    }
  }

  // 4) cleanup any stale decorations
  for (const key of Array.from(styles.keys())) {
    if (!seen.has(key)) {
      styles.get(key)!.dispose();
      styles.delete(key);
    }
  }
}
