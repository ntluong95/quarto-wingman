import * as vscode from "vscode";
import { wingmanCodeLensProvider } from "./codelens";
import { registerCellOptionsCommands } from "./cell-configuration";
import { registerInlineRepl } from "./repl";
import { registerCellOptionHoverProvider } from "./hoverProvider";
import { insertCitation } from "./zotero";
import { insertCodeChunk } from "./insert";

async function toggleQuartoEditorMode() {
  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  const activeInput = activeTab?.input;
  const isVisualMode =
    activeInput instanceof vscode.TabInputCustom &&
    activeInput.viewType === "quarto.visualEditor";

  const command = isVisualMode
    ? "quarto.editInSourceMode"
    : "quarto.editInVisualMode";

  try {
    await vscode.commands.executeCommand(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      `Could not switch Quarto editor mode: ${message}`
    );
  }
}

export async function activate(context: vscode.ExtensionContext) {
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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "quarto-wingman.toggleEditorMode",
      toggleQuartoEditorMode
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("quarto-wingman.insertCodeChunk", insertCodeChunk)
  );
}

export function deactivate(): Thenable<void> | undefined {
  return undefined;
}
