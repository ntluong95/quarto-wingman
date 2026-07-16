# Change Log

## 0.1.2

- Fix the "Cell Options" CodeLens not showing for cells that include a chunk label (e.g. ` ```{r label} `). Detection now matches the full braced info string and accepts any language name instead of a hard-coded list.
- Show the "Run Inline Code" (`# >>>`) CodeLens in every file type and language instead of only Python and R. Execution routes to the matching runtime by the document's language id (falling back to a terminal when no runtime is available).
- Add a keyboard shortcut (`Ctrl+Enter` / `Cmd+Enter`) that runs the inline `# >>>` block at the cursor. It only overrides the key while the cursor is inside an inline REPL block, so it stays out of the way elsewhere.

## 0.1.1

- Compare document YAML front matter against project `_quarto.yml`. Keys that duplicate a project setting are shown as faded hints (safe to remove); keys whose value differs from the project value are flagged as informational diagnostics indicating the document value will be applied. Fixes #5.

## 0.1.0

- Add supports for Julia kernel.

## 0.0.9

- Fix issue related to Zotero citation does not work

## 0.0.8

- Remove semantic highlighting as Quarto extension already provide it
- Add a `Insert Code Chunk` command that allows user to insert a code chunk with a language of their choice.

## 0.0.7

- Add a button to cite document from a runtime Zotero

## 0.0.6

- Cite reference directly from a Zotero runtime and update the `*.bib` file. Default is to the `*.bib` file relative to the workspace root. Command `Quarto Wingman: Select citation from Zotero`

## 0.0.5

- Fix problem when running inline code for VSCode user

## 0.0.4

- Update new logo

## 0.0.3

- Disable `Run Inline Code` for VSCode for future investigation

## 0.0.2

- Fix the error the codelens not displaying

## 0.0.1

- Initial release
