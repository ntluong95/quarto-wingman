// generate-quarto-grammar.js
const fs = require("fs");
const path = require("path");

// 1. We only care about these two token types
const legend = {
  tokenTypes: ["module", "class"],
};

// 2. Map to TextMate scopes
const typeToScope = {
  module: "support.module.python",
  class: "entity.name.class.python",
};

// 3. Build the minimal grammar
const patterns = legend.tokenTypes.map((type) => ({
  name: typeToScope[type],
  match: "(?!)", // no-op; we only need to register the scope
}));

const grammar = {
  // injectionSelector controls *where* this grammar applies.
  // Here we target Python code fences inside Quarto documents.
  injectionSelector:
    "L:source.quarto meta.embedded.block.markdown source.python",
  scopeName: "source.python.quarto.semantic",
  patterns,
  repository: {},
};

// 4. Write it out
const outDir = path.join(__dirname, "syntaxes");
const outPath = path.join(outDir, "python.quarto.semantic.tmLanguage.json");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(grammar, null, 2));

console.log(`→ Generated Quarto-only Python semantic grammar at ${outPath}`);
