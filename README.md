# Python Custom Injection

**Python Custom Injection** is a TextMate injection grammar that extends Python syntax highlighting. It is designed to enhance the visual differentiation of key tokens within Python code, especially when embedded in markdown or other contexts (such as in code cells). This injection grammar:

- Highlights module names in import statements (e.g. in import numpy as np or from os.path import join).

- Captures aliases defined with the as keyword.

- Separates object names from function names in method calls (e.g. in df.head(), the object and function are styled independently).

- Highlights variable declarations (identifiers on the left side of an assignment) but excludes those preceded by self..

- Ensures none of these rules apply inside comment lines.

## Features
- Module & Namespace Highlighting: Custom rules detect module names in both import and from ... import ... statements, applying the entity.name.namespace scope.

- Alias Detection: Identifiers following the as keyword are captured so you can style module aliases (like np in import numpy as np) with a dedicated scope.

- Function Call Enhancement: In function calls that use dot notation, the token before the dot (object name) and the function name are captured separately. For example, in df.head(), df is tagged with a different scope from .head.

- Variable Declaration Highlighting: Variable declarations are detected by matching identifiers followed by an equals sign, while avoiding matches when they are part of object attribute assignments (e.g. when preceded by self.).

- Comment Exclusion: None of these rules are applied within the comment scope (comment.line.number-sign.python), ensuring that comment text remains unaltered.

- Highlighting footnote, both in-line footnote and block footnote references or definitions (e.g., [^1]: Note content or [^1] references).
  

## Configurations

entity.name.namespace

meta.function-call.generic.python

variable.parameter.function-call.python

text.html.quarto.quartofn


"editor.tokenColorCustomizations": {
  "textMateRules": [
    {
      "scope": [
        "meta.footnote.inline.quarto",
        "meta.footnote.reference.quarto",
        "meta.footnote.definition.quarto"
      ],
      "settings": {
        "foreground": "#c586c0",
        "fontStyle": "italic"
      }
    }
  ]
}

## Installation

```bash
npx vsce package
```

## Contributing
Contributions, bug reports, and feature requests are welcome!
Feel free to fork the repository and submit a pull request with your enhancements.