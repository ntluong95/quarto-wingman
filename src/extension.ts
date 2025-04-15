// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { registerInlineRepl } from './repl';
import { registerCellOptionHoverProvider } from './hoverProvider';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Positron Inline REPL activated!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('python-inline-repl.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed


	// let commentReplCmd = vscode.commands.registerTextEditorCommand(
	// 	'inline-repl.commentAsRepl',
	// 	(editor, edit) => {
	// 	  const selections = editor.selections;
	  
	// 	  editor.edit(editBuilder => {
	// 		for (const selection of selections) {
	// 		  const line = editor.document.lineAt(selection.start.line);
	// 		  const text = line.text.trim();
	// 		  if (text.length > 0 && !text.startsWith('# >>>')) {
	// 			const indentation = line.firstNonWhitespaceCharacterIndex;
	// 			const commentPrefix = line.text.substring(0, indentation);
	// 			editBuilder.replace(line.range, `${commentPrefix}# >>> ${text}`);
	// 		  }
	// 		}
	// 	  });
	// 	}
	//   );
	  
	// context.subscriptions.push(commentReplCmd);

    // context.subscriptions.push(disposable);
	registerCellOptionHoverProvider(context);
    registerInlineRepl(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
