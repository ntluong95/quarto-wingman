// cellOptions.ts
export const cellOptions: Record<string, Record<string, string[]>> = {
    "Attributes": {
      "label": [
        '`label` — Unique label for code cell. Used when other code needs to refer to the cell (e.g. for cross references `fig-samples` or `tbl-summary`).'
      ],
      "classes": ['`classes` — Classes to apply to cell container.'],
      "tags": ['`tags` — Array of tags for notebook cell.'],
      "id": ['`id` — Notebook cell identifier. If no `id` is present, `label` will be used instead. See [Jupyter proposal](https://jupyter.org/enhancement-proposals/62-cell-id/cell-id.html)']
    },
    "Code Output": {
      eval: [
        '`eval` — Evaluate code cells (if `false` just echos the code into output).',
        '',
        '- `true` (default): evaluate code cell',
        '- `false`: don’t evaluate code cell',
        '- `[...]:` A list of positive or negative line numbers to selectively include or exclude lines (knitr only)'
      ],
      "echo": [
        '`echo` — Include cell source code in rendered output.',
        '',
        '- `true` (default): include source code',
        '- `false`: do not include code (default in presentation formats lik `beamer`, `revealjs`, `pptx`)',
        '- `fenced`: in addition to echoing, include the cell delimiter as part of the output',
        '- `[...]:` A list of positive or negative line numbers to selectively include or exclude lines (knitr only)'
      ],
      "code-fold": [
        '`code-fold` — Collapse code into an HTML `<details>` tag so the user can display it on-demand.',
        '',
        '- `true`: collapse code',
        '- `false` (default): do not collapse',
        '- `show`: use the <details> tag, but show the expanded code initially'
      ],
      "code-summary": ['`code-summary` — Summary text to use for code blocks collapsed using `code-fold`'],
      "code-overflow": ['`code-overflow` — Choose overflow strategy (e.g. `scroll`, `wrap`).'],
      "code-line-numbers": [
        '`code-line-numbers` — Include line numbers or specify highlight animation (`true` or `false`). For revealjs output only, you can also specify a string to highlight specific lines (and/or animate between sets of highlighted lines).',
        '',
        'Examples:',
        '- Sets of lines are denoted with commas: `3,4,5`',
        '- Ranges can be denoted with dashes and combined with commas: `1-3,5`',
        '- Finally, animation steps are separated by`|5|5-10,12`'
      ],
      "lst-label": ['`lst-label` — Label for code listing (used for cross references).'],
      "lst-cap": ['`lst-cap` — Caption for code listing.'],
      "tidy": ['`tidy` — `knitr` only: Whether to reformat R code.'],
      "tidy-opts": ['`tidy-opts` — `knitr` only: List of options to pass to tidy handler.'],
      "collapse": ['`collapse` — `knitr` only: Collapse all the source and output blocks from one code chunk into a single block.'],
      "prompt": ['`prompt` — `knitr` only: Whether to add the prompt characters in R code. See prompt and continue on the help page `?base::options`. Note that adding prompts can make it difficult for readers to copy R code from the output, so prompt: false may be a better choice. This option may not work well when the engine is not R.'],
      "class-source": ['`class-source` — `knitr` only: Class name(s) for source code blocks.'],
      "attr-source": ['`tattr-source` — `knitr` only: Attribute(s) for source code blocks.']
    },
    "Cell Output": {
      "output": [
        '`output` — Include code execution results in output.',
        '',
        '- `true`: include results',
        '- `false`: hide results',
        '- `asis`: treat as raw markdown'
      ],
      "warning": ['`warning` — Include warnings in rendered output.'],
      "error": ['`error` — Include errors in output(note that this implies that errors executing code will not halt processing of the document).'],
      "include": ['`include` — Catch all for preventing any output (code or results) from being included in output.'],
      "panel": ['`panel` — Panel type for cell output : `tabset`, `input`, `sidebar`, `fill`, `center`.'],
      "output-location": [
        '`output-location` — Location of output relative to the code that generated it. The possible values are as follows:',
        '',
        '- `default`: Normal flow of the slide after the code',
        '- `fragment`: In a fragment (not visible until you advance)',
        '- `slide`: On a new slide after the curent one',
        '- `column`: In an adjacent column', 
        '- `column-fragment`: In an adjacent column (not visible until you advance)'
      ],
      "message": ['`message` — `knitr` only: Include messages in rendered output. Possible values are `true`, `false`, or `NA`. If `true`, messages are included in the output. If `false`, messages are not included. If `NA`, messages are not included in output but shown in the knitr log to console.'],
      "results": ['`results` — `knitr` only: How to display text results. Note that this option only applies to normal text output (not warnings, messages, or errors). The possible values are `markup`, `asis`, `hold`, `hide`'],
      "comment": ['`comment` — `knitr` only: Prefix to be added before each line of text output. By default, the text output is commented out by ##, so if readers want to copy and run the source code from the output document, they can select and copy everything from the chunk, since the text output is masked in comments (and will be ignored when running the copied text). Set comment: ’’ to remove the default.'],
      "class-output": ['`class-output` — `knitr` only: Class name(s) for text/console output.'],
      "attr-output": ['`attr-output` — `knitr` only: Attribute(s) for text/console output.'],
      "class-warning": ['`class-warning` — `knitr` only: Class name(s) for warning output.'],
      "attr-warning": ['`attr-warning` — `knitr` only: Attribute(s) for warning output.'],
      "class-message": ['`class-message` — `knitr` only: Class name(s) for message output.'],
      "attr-message": ['`attr-output` — `knitr` only: Attribute(s) for message output.'],
      "class-error": ['`class-error` — `knitr` only: Class name(s) for error output.'],
      "attr-error": ['`attr-error` — `knitr` only: Attribute(s) for error output.']
    },
    "Figures": {
      "fig-cap": ['`fig-cap` — Caption for figure.'],
      "fig-subcap": ['`fig-subcap` — Subcaptions for figures.'],
      "fig-link": ['`fig-link` — Hyperlink target for the figure.'],
      "fig-align": ['`fig-align` — Figure horizontal alignment (`left`, `right`, `center`, `default`).'],
      "fig-alt": ['`fig-alt` — Alternative text for images.'],
      "fig-env": ['`fig-env` — LaTeX environment for figures.'],
      "fig-pos": ['`fig-pos` — LaTeX figure position (e.g. `H`, or false for none).'],
      "fig-scap": ['`fig-scap` — Short caption (used in PDF lists).'],
      "fig-format": ['`fig-format` — `knitr` only: Default output format for figures (retina, png, jpeg, svg, or pdf).'],
      "fig-dpi": ['`fig-dpi` — `knitr` only: Default DPI for figures.'],
      "fig-asp": ['`fig-asp` — `knitr` only: The aspect ratio of the plot, i.e., the ratio of height/width. When `fig-asp` is specified, the height of a plot (the option `fig-height`) is calculated from `fig-width` * `fig-asp`.'],
      "out-width": ['`out-width` — `knitr` only: Width of the plot in the output document, which can be different from its physical fig-width, i.e., plots can be scaled in the output document. When used without a unit, the unit is assumed to be pixels. However, any of the following unit identifiers can be used: px, cm, mm, in, inch and %, for example, 3in, 8cm, 300px or 50%.'],
      "out-height": ['`out-height` — `knitr` only: Height of the plot in the output document, which can be different from its physical fig-height, i.e., plots can be scaled in the output document. Depending on the output format, this option can take special values. For example, for LaTeX output, it can be 3in, or 8cm; for HTML, it can be 300px.'],
      "fig-keep": ['`fig-dpi` — `knitr` only: How plots in chunks should be kept. Possible values are as follows: `high`, `none`, `all`, `first`, `last` or a numeric vector'],
      "fig-show": ['`fig-show` — `knitr` only: How to show/arrange the plots. Possible values are as follows: `asis`, `hold`, `animate`, `hide`.'],
      "out-extra": ['`out-extra` — `knitr` only: Additional raw LaTeX or HTML options to be applied to figures.'],
      "external": ['`external` — `knitr` only: Externalize tikz graphics (pre-compile to PDF).'],
      "sanitize": ['`sanitize` — `knitr` only: Sanitize tikz graphics (escape special LaTeX characters).'],
      "interval": ['`interval` — `knitr` only: Time interval (number of seconds) between animation frames.'],
      "aniopts": ['`aniopts` — `knitr` only: Extra options for animations; see the documentation of the LaTeX animate package.'],
      "animation-hook": ['`animation-hook` — `knitr` only: Hook function to create animations in HTML output.'],
    },
    "Tables": {
      "tbl-cap": ['`tbl-cap` — Table caption.'],
      "tbl-subcap": ['`tbl-subcap` — Table subcaptions.'],
      "tbl-colwidths": [
        '`tbl-colwidths` — Apply explicit table column widths for markdown grid tables and pipe tables that are more than `columns` characters wide (72 by default). Some formats (e.g. HTML) do an excellent job automatically sizing table columns and so don’t benefit much from column width specifications. Other formats (e.g. LaTeX) require table column sizes in order to correctly flow longer cell content (this is a major reason why tables > 72 columns wide are assigned explicit widths by Pandoc).',
        '',
        '- `auto`: Apply markdown table column widths except when there is a hyperlink in the table (which tends to throw off automatic calculation of column widths based on the markdown text width of cells). (auto is the default for HTML output formats).',
        '- `true`: Always apply markdown table widths (true is the default for all non-HTML formats).',
        '- ``false`: Never apply markdown table widths.',
        '- An array of numbers (e.g. `[40, 30, 30]`): Array of explicit width percentages.'
      ],
      "html-table-processing": ['`html-table-processing` — If `none`, don’t touch raw HTML tables.']
    },
    "Panel Layout": {
      "layout": ['`layout` — 2D array of widths to layout blocks side-by-side or stacked.'],
      "layout-ncol": ['`layout-ncol` — Number of layout columns.'],
      "layout-nrow": ['`layout-nrow` — Number of layout rows.'],
      "layout-align": ['`layout-align` — Horizontal alignment of layout (left, center, right).'],
      "layout-valign": ['`layout-valign` — Vertical alignment of layout (top, center, bottom).']
    },
    "Page Columns": {
      "column": ['`column` — Output column for page layout.'],
      "fig-column": ['`fig-column` — Column for figure.'],
      "tbl-column": ['`tbl-column` — Column for table.'],
      "cap-location": ['`cap-location` — Caption position (top, bottom, margin).'],
      "fig-cap-location": ['`fig-cap-location` — Caption for figure.'],
      "tbl-cap-location": ['`tbl-cap-location` — Caption for table.']
    },
    "Cache": {
      "cache": ['`cache` — `knitr` only: Whether to cache a code chunk. When evaluating code chunks for the second time, the cached chunks are skipped (unless they have been modified), but the objects created in these chunks are loaded from previously saved databases (.rdb and .rdx files), and these files are saved when a chunk is evaluated for the first time, or when cached files are not found (e.g., you may have removed them by hand). Note that the filename consists of the chunk label with an MD5 digest of the R code and chunk options of the code chunk, which means any changes in the chunk will produce a different MD5 digest, and hence invalidate the cache'],
      "cache-vars": ['`cache-vars` — `knitr` only: Variable names to be saved in the cache database. By default, all variables created in the current chunks are identified and saved, but you may want to manually specify the variables to be saved, because the automatic detection of variables may not be robust, or you may want to save only a subset of variables.'],
      "cache-globals": ['`cache-globals` — `knitr` only: Variables names that are not created from the current chunk.'],
      "cache-lazy": ['`cache-lazy` — `knitr` only: Whether to lazyLoad() or directly load() objects. For very large objects, lazyloading may not work, so cache-lazy: false may be desirable.'],
      "cache-rebuild": ['`cache-rebuild` — `knitr` only: Force rebuild of cache for chunk.'],
      "cache-comments": ['`cache-comments` — `knitr` only: Prevent comment changes from invalidating the cache for a chunk.'],
      "dependson": ['`dependson` — `knitr` only: Explicitly specify cache dependencies for this chunk (one or more chunk labels).'],
      "autodep": ['`autodep` — `knitr` only: Detect cache dependencies automatically via usage of global variables.']
    },
    "Include": {
      "child": ['`child` — `knitr` only:  One or more paths of child documents to be knitted and input into the main document.'],
      "file": ['`file` — `knitr` only:  File containing code to execute for this chunk.'],
      "code": ['`code` — `knitr` only:  String containing code to execute for this chunk.'],
      "purl": ['`fpurl` — `knitr` only:  Include chunk when extracting code with `knitr::purl()`.']
    }
  };
  