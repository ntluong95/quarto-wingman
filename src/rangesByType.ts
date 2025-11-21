// src/rangesByType.ts
import * as vscode from "vscode";

/**
 * Returns a map: tokenType ("module"/"class")
 *   → Map<symbolName, Range[]>
 */
export function rangesByType(
  tokens: vscode.SemanticTokens,
  legend: vscode.SemanticTokensLegend,
  editor: vscode.TextEditor
): Map<string, Map<string, vscode.Range[]>> {
  const data = tokens.data;
  let ptr = 0,
    line = 0,
    char = 0;
  const result = new Map<string, Map<string, vscode.Range[]>>();

  while (ptr < data.length) {
    const deltaLine = data[ptr++];
    const deltaChar = data[ptr++];
    const length = data[ptr++];
    const tType = data[ptr++];
    const tMods = data[ptr++];

    line += deltaLine;
    char = deltaLine === 0 ? char + deltaChar : deltaChar;

    const typeName = legend.tokenTypes[tType];
    if (typeName === "module" || typeName === "class") {
      const start = new vscode.Position(line, char);
      const end = new vscode.Position(line, char + length);
      const name = editor.document.getText(new vscode.Range(start, end));

      if (!result.has(typeName)) {
        result.set(typeName, new Map());
      }
      const byName = result.get(typeName)!;
      if (!byName.has(name)) {
        byName.set(name, []);
      }
      byName.get(name)!.push(new vscode.Range(start, end));
    }
  }

  return result;
}
