# Quarto Wingman

**Quarto Wingman** is a Positron/VSCode (and all CodeOSS alike) extension designed to enhance the editing experience for Quarto documents and scripts. It provides interactive code cell configuration based on Quarto documentation. Additionally, it enhances footnote display in documents and offers an inline code runner for R and Python scripts, making it especially useful for data exploration. Developed with modern data science workflows in mind, Quarto Wingman brings a streamlined, polyglot data science IDE experience to users.

## Features

- Provide code cell options for quarto document. The documentation was refered from [Quarto Homepage](https://quarto.org/docs/reference/cells/cells-knitr.html)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto1.png)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto2.png)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto3.png)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto4.png)

- **Cite reference directly from a Zotero runtime** and update the `*.bib` file.Default is to the `*.bib` file relative to the workspace root. Command `Quarto Wingman: Select citation from Zotero`. Please make sure you have [Better BibTeX for Zotero](https://retorque.re/zotero-better-bibtex/installation/index.html) is installed and enabled. Worked only for Zotero 8 or higher version.

  Zotero 8 compatibility note: citation keys now live in Zotero's native `Citation key` field. If the field is empty, the extension cannot export/append BibTeX for that item. If this happens, run Better BibTeX key migration/refresh and confirm selected items have non-empty citation keys.

  Optional fallback without Zotero Web API: set `zoteroForQuarto.pullExportUrl` in settings JSON to a Better BibTeX pull-export URL (copy from Zotero by right-clicking a library/collection and choosing `Download Better BibTeX export...`).

- Highlighting footnote, both in-line footnote and block footnote references or definitions (e.g., [^1]: Note content or [^1] references). Three new token are introduced including `meta.footnote.inline.quarto`, `meta.footnote.reference.quarto`, `meta.footnote.definition.quarto`

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/footnote.png)

- Add a `Run Inline Code` button to `.r` and `.py` script that allows user to run code in comment. It is useful for data exploration task where you want to keep the experiment code in your script without interfere the entire workflow.

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/inline-code.png)

- Compare document YAML front matter against the project's `_quarto.yml` (Quarto resolves document metadata on top of project metadata — see https://quarto.org/docs/projects/quarto-projects.html#shared-metadata). Keys that exactly duplicate a project setting are faded as `Hint` diagnostics (safe to remove), and keys whose value differs are flagged as `Information` diagnostics showing both the project value and the document value that will be applied. The closest `_quarto.yml` (or `_quarto.yaml`) walking up from the document's folder is used.

- Provide a `Insert Code Chunk` command that allows user to insert a code chunk with a language of their choice. Please remove default keybiding `quarto.insertCodeCell` from Quarto extension to make this feature works.

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/insert-code.png)

## 🙏 Attribution

Created by [ntluong95](https://github.com/ntluong95)  
Licensed under the [MIT License](./LICENSE)

## 💡 Future Ideas

If you have any ideas for new features, please open a new issue at https://github.com/ntluong95/quarto-wingman/issues
