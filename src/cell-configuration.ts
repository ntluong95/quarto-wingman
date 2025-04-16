import * as vscode from "vscode";
import { cellOptions } from "./cellOptions";

export class ConfigureCellOptionsCommand {
  public static readonly id = "quarto-wingsman.configureCellOptions";

  public async execute(line: number): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    // STEP 1: Select a Main Section (Attributes, Code Output, etc.)
    const mainSections: vscode.QuickPickItem[] = Object.keys(cellOptions).map(category => ({
      label: `$(settings-gear) ${category}`, // Using a Codicon (folder)
      description: `Select options under "${category}"`,
      detail: ""
    }));

    const mainPick = await vscode.window.showQuickPick(mainSections, {
      placeHolder: "Select a main section (Attributes, Code Output, etc.)"
    });
    if (!mainPick) {
      return;
    }
    // Remove the icon prefix to obtain the plain category name.
    const chosenSection = mainPick.label.replace(/^\$\(.+?\)\s*/, "");

    // STEP 2: Select an Option within the Chosen Section
    const subOptions = Object.keys(cellOptions[chosenSection]).map(optionKey => ({
      label: optionKey,
      description: `$(symbol-key) ${optionKey}`,
      detail: cellOptions[chosenSection][optionKey][0] || ""
    }));
    // Also allow for a custom option.
    subOptions.push({
      label: "custom...",
      description: "Enter a custom cell option name",
      detail: ""
    });

    const subPick = await vscode.window.showQuickPick(subOptions, {
      placeHolder: `Select an option under "${chosenSection}"`
    });
    if (!subPick) {
      return;
    }

    let finalKey = subPick.label;
    if (finalKey === "custom...") {
      const custom = await vscode.window.showInputBox({
        prompt: "Enter custom option name"
      });
      if (!custom) {
        return;
      }
      finalKey = custom;
    }

    // STEP 3: Prompt the User for a Value
    const value = await vscode.window.showInputBox({
      prompt: `Set value for '${finalKey}'`,
      placeHolder: "true / false / string / number"
    });
    if (value === undefined) {
      return;
    }

    // Insert the new configuration line after the current code cell.
    const insertPos = new vscode.Position(line + 1, 0);
    await editor.edit(editBuilder => {
      editBuilder.insert(insertPos, `#| ${finalKey}: ${value}\n`);
    });
  }
}

// This function registers your cell options command (which is invoked by the CodeLens)
export function registerCellOptionsCommands(context: vscode.ExtensionContext): void {
    const command = new ConfigureCellOptionsCommand();
    const disposable = vscode.commands.registerCommand(
      ConfigureCellOptionsCommand.id, 
      (line: number) => command.execute(line)
    );
    context.subscriptions.push(disposable);
  }