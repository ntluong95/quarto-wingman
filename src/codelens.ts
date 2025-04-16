// codelens.ts
import * as vscode from "vscode";
import MarkdownIt from "markdown-it";

// Derive the Token type from MarkdownIt's parse() method
type Token = ReturnType<MarkdownIt["parse"]>[number];

/**
 * Checks if a given token represents an executable code block.
 * Only tokens with an info string starting with a curly-brace (e.g. "{r}" or "{python}") are considered.
 *
 * @param token A token produced by MarkdownIt.
 * @returns true if the token is an executable code cell.
 */
function isExecutableBlock(token: Token): boolean {
  if (token.type !== "fence" || !token.info) return false;
  const firstWord = token.info.trim().split(/\s+/)[0];
  // Match only if the info string starts with an opening brace.
  const regex = /^\{(r|python|julia|bash|sql)(?=[,\}\s])/;
  return regex.test(firstWord);
}

/**
 * A simple Markdown engine that uses MarkdownIt to parse a VS Code document.
 */
class MarkdownEngine {
  private readonly parser = new MarkdownIt({ html: false });

  /**
   * Parses the given text document and returns an array of MarkdownIt tokens.
   *
   * @param document The VS Code text document to parse.
   * @returns An array of tokens.
   */
  parse(document: vscode.TextDocument): Token[] {
    return this.parser.parse(document.getText(), {}) as Token[];
  }
}

/**
 * Provides CodeLenses for executable code blocks in Quarto documents.
 *
 * This provider scans the document for tokens that represent executable code blocks,
 * and adds a CodeLens just above each executable block.
 *
 * @returns A vscode.CodeLensProvider instance.
 */
export function wingmanCodeLensProvider(): vscode.CodeLensProvider {
  const engine = new MarkdownEngine();

  return {
    provideCodeLenses(document: vscode.TextDocument, cancellationToken: vscode.CancellationToken): vscode.CodeLens[] {
      const lenses: vscode.CodeLens[] = [];
      const tokens = engine.parse(document);

      for (const token of tokens) {
        if (cancellationToken.isCancellationRequested) break;
        if (!isExecutableBlock(token) || !token.map) continue;

        // The token map contains the start and end lines of the block
        const line = token.map[0];
        const range = new vscode.Range(line, 0, line, 0);

        lenses.push(
          new vscode.CodeLens(range, {
            title: "$(settings-gear) Cell Options",
            tooltip: "Add or edit code cell options",
            command: "quarto-wingman.configureCellOptions",
            arguments: [line],
          })
        );
      }
      return lenses;
    },
  };
}
