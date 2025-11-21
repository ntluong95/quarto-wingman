import * as vscode from 'vscode';



export async function insertCodeChunk() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const languages = ['python', 'r', 'julia', 'bash', 'sql', 'ojs', 'mermaid', 'dot'];

    const snippet = new vscode.SnippetString();
    snippet.appendText('```{');
    snippet.appendChoice(languages);
    snippet.appendText('}\n');
    snippet.appendTabstop(0);
    snippet.appendText('\n```');
    editor.insertSnippet(snippet);
}