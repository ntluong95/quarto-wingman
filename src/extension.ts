// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { wingsmanCodeLensProvider } from './codelens';
import { registerInlineRepl } from './repl';
import { registerCellOptionHoverProvider } from './hoverProvider';



export async function activate(context: vscode.ExtensionContext) {
  // Register the configure cell options command
  const configureCmd = vscode.commands.registerCommand(
    "quarto-wingsman.configureCellOptions",
    async (line: number) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const option = await vscode.window.showQuickPick(
        ["echo", "eval", "output", "label", "message", "warning", "custom..."],
        { placeHolder: "Choose a cell option to insert" }
      );
      if (!option) return;

      let key = option;
      if (option === "custom...") {
        const custom = await vscode.window.showInputBox({
          prompt: "Enter custom option name",
        });
        if (!custom) return;
        key = custom;
      }

      const value = await vscode.window.showInputBox({
        prompt: `Set value for '${key}'`,
        placeHolder: "true / false / string / number",
      });
      if (value === undefined) return;

      const insertPos = new vscode.Position(line + 1, 0);
      await editor.edit(editBuilder => {
        editBuilder.insert(insertPos, `#| ${key}: ${value}\n`);
      });
    }
  );
  context.subscriptions.push(configureCmd);

  // Register the CodeLens provider for Quarto documents.
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ language: "quarto" }, wingsmanCodeLensProvider())
  );
	registerCellOptionHoverProvider(context);
	registerInlineRepl(context);
}

// this method is called when your extension is deactivated
export function deactivate() { }
