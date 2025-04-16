# Quarto Wingman

**Quarto Wingman** is a Positron/VSCode (and all CodeOSS alike) extension designed to enhance the editing experience for Quarto documents and scripts. It provides interactive code cell configuration based on Quarto documentation, improved syntax highlighting for Python code (particularly when Pylance is not available), and intelligent token recognition for module imports, function calls, and variable declarations. Additionally, it enhances footnote display in documents and offers an inline code runner for R and Python scripts, making it especially useful for data exploration. Developed with modern data science workflows in mind, Quarto Wingman brings a streamlined, polyglot data science IDE experience to users.

## Features
- Provide code cell options for quarto document. The documentation was refered from [Quarto Homepage](https://quarto.org/docs/reference/cells/cells-knitr.html)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto1.png)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto2.png)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto3.png)

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/quarto4.png)


- Improving syntax highlighting for Python code in `.qmd` document. This function is useful when Pylance is not available. You can use `Developer: Inspect Editor Tokens and Scopes` to inspect which are available token: 
  - Module keywords: Identify module name and module alias (like import `numpy` as `np`).

  - Function Call Enhancement: In function calls that use dot notation, the token before the dot (object name) and the function name are captured.

  - Variable Declaration Highlighting: Variable declarations are detected by matching identifiers followed by an equals sign, while avoiding matches when they are part of object attribute assignments.

- Highlighting footnote, both in-line footnote and block footnote references or definitions (e.g., [^1]: Note content or [^1] references). Three new token are introduced including `meta.footnote.inline.quarto`, `meta.footnote.reference.quarto`, `meta.footnote.definition.quarto`

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/footnote.png)

- Add a `Run Inline Code` button to `.r` and `.py` script that allows user to run code in comment. It is useful for data exploration task where you want to keep the experiment code in your script without interfere the entire workflow.

![](https://raw.githubusercontent.com/ntluong95/quarto-wingman/refs/heads/main/resources/inline-code.png)


## 🙏 Attribution

Created by [ntluong95](https://github.com/ntluong95)  
Licensed under the [MIT License](./LICENSE)
  

## 💡 Future Ideas

- [ ] Snippets for different type of Quarto project

