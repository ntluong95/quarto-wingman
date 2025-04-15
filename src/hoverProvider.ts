import * as vscode from 'vscode';

// Raw descriptions grouped by section, now supporting bullet points
const cellOptions: Record<string, Record<string, string[]>> = {
  "Attributes": {
    label: [
      '`label` — Unique label for code cell. Used when other code needs to refer to the cell (e.g. for cross references `fig-samples` or `tbl-summary`).'
    ],
    classes: ['`classes` — Classes to apply to cell container.'],
    tags: ['`tags` — Array of tags for notebook cell.'],
    id: ['`id` — Notebook cell identifier. If no `id` is present, `label` will be used instead. See [Jupyter proposal](https://jupyter.org/enhancement-proposals/62-cell-id/cell-id.html)']
  },
  "Code Output": {
    eval: [
      '`eval` — Evaluate code cells (if `false` just echos the code into output).',
      '',
      '- `true` (default): evaluate code cell',
      '- `false`: don’t evaluate code cell',
      '- `[...]:` Selectively include/exclude lines (knitr only)'
    ],
    echo: [
      '`echo` — Include cell source code in rendered output.',
      '',
      '- `true` (default): include source code',
      '- `false`: do not include code (e.g. in beamer, revealjs, pptx)',
      '- `fenced`: also include code block delimiter',
      '- `[...]:` Selectively show lines (knitr only)'
    ],
    "code-fold": [
      '`code-fold` — Collapse code into an HTML `<details>` tag.',
      '',
      '- `true`: collapse code',
      '- `false` (default): do not collapse',
      '- `show`: initially expanded'
    ],
    "code-summary": ['`code-summary` — Summary text shown on collapsed code blocks.'],
    "code-overflow": ['`code-overflow` — Choose overflow strategy (e.g. `scroll`, `wrap`).'],
    "code-line-numbers": [
      '`code-line-numbers` — Include line numbers or specify highlight animation.',
      '',
      'Examples:',
      '- `true`, `false`',
      '- `3,4,5`',
      '- `1-3,5`',
      '- `|5|5-10,12`'
    ],
    "lst-label": ['`lst-label` — Label for code listing (used for cross references).'],
    "lst-cap": ['`lst-cap` — Caption for code listing.']
  },
  "Cell Output": {
    output: [
      '`output` — Include code execution results in output.',
      '',
      '- `true`: include results',
      '- `false`: hide results',
      '- `asis`: treat as raw markdown'
    ],
    warning: ['`warning` — Include warnings in rendered output.'],
    error: ['`error` — Include errors in output, execution continues.'],
    include: ['`include` — Master switch to exclude all code/results from output.'],
    panel: ['`panel` — Panel type: `tabset`, `input`, `sidebar`, `fill`, `center`.'],
    "output-location": [
      '`output-location` — Where to place output relative to code.',
      '',
      '- `default`',
      '- `fragment`',
      '- `slide`',
      '- `column`, `column-fragment` (revealjs only)'
    ]
  },
  "Figures": {
    "fig-cap": ['`fig-cap` — Caption for figure.'],
    "fig-subcap": ['`fig-subcap` — Subcaptions for figures.'],
    "fig-link": ['`fig-link` — Hyperlink target for the figure.'],
    "fig-align": ['`fig-align` — left, right, center, default.'],
    "fig-alt": ['`fig-alt` — Alternative text for images.'],
    "fig-env": ['`fig-env` — LaTeX environment for figures.'],
    "fig-pos": ['`fig-pos` — LaTeX figure position (e.g. `H`, or false for none).'],
    "fig-scap": ['`fig-scap` — Short caption (used in PDF lists).']
  },
  "Tables": {
    "tbl-cap": ['`tbl-cap` — Table caption.'],
    "tbl-subcap": ['`tbl-subcap` — Table subcaptions.'],
    "tbl-colwidths": [
      '`tbl-colwidths` — Explicit column widths for wide tables.',
      '',
      '- `auto`, `true`, `false`',
      '- `[40, 30, 30]`: percentage widths'
    ],
    "html-table-processing": ['`html-table-processing` — If `none`, don’t touch raw HTML tables.']
  },
  "Panel Layout": {
    layout: ['`layout` — 2D array of widths to layout blocks side-by-side or stacked.'],
    "layout-ncol": ['`layout-ncol` — Number of layout columns.'],
    "layout-nrow": ['`layout-nrow` — Number of layout rows.'],
    "layout-align": ['`layout-align` — Horizontal alignment of layout (left, center, right).'],
    "layout-valign": ['`layout-valign` — Vertical alignment of layout (top, center, bottom).']
  },
  "Page Columns": {
    column: ['`column` — Output column for page layout.'],
    "fig-column": ['`fig-column` — Column for figure.'],
    "tbl-column": ['`tbl-column` — Column for table.'],
    "cap-location": ['`cap-location` — Caption position (top, bottom, margin).'],
    "fig-cap-location": ['`fig-cap-location` — Caption for figure.'],
    "tbl-cap-location": ['`tbl-cap-location` — Caption for table.']
  }
};

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
