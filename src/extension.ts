import * as vscode from 'vscode';
import { wingsmanCodeLensProvider } from './codelens';
import { registerCellOptionsCommands } from './cell-configuration';
import { registerInlineRepl } from './repl';
import { registerCellOptionHoverProvider } from './hoverProvider';

export async function activate(context: vscode.ExtensionContext) {
  // Register the command for configuring cell options.
  registerCellOptionsCommands(context);

  // Register the CodeLens provider for Quarto documents.
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ language: "quarto" }, wingsmanCodeLensProvider())
  );

  // Register the hover provider for cell options.
  registerCellOptionHoverProvider(context);

  // Register inline REPL support.
  registerInlineRepl(context);
}

export function deactivate() { }
