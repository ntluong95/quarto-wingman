import * as vscode from 'vscode';
import { cellOptions } from './cellOptions'; // Import the shared cell options

export function registerCellOptionHoverProvider(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(['python', 'r'], {
      provideHover(document, position) {
        const line = document.lineAt(position.line).text;
        if (!/^#\s?\|/.test(line.trimStart())) return;

        const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_-]+/);
        if (!range) return;

        const word = document.getText(range);
        for (const groupKey in cellOptions) {
          const group = cellOptions[groupKey];
          if (Object.prototype.hasOwnProperty.call(group, word)) {
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`### ${groupKey}\n\n`);
            markdown.appendMarkdown(group[word].join('\n'));
            // Optionally, add a code block if needed:
            // markdown.appendCodeblock(`#| ${word}: ...`, 'qmd');
            markdown.isTrusted = true;
            return new vscode.Hover(markdown);
          }
        }
        return;
      }
    })
  );
}
