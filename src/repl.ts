import * as vscode from 'vscode';

function reportError(msg: string) {
  return (err: string) => console.error(`${msg}: ${err}`);
}

const replPattern = /^(\s*#>?\s+)?>>>(.*)$/;

// ✅ Helper: Detect if we're in Positron
function isRunningInPositron(): boolean {
  const found = vscode.extensions.all.some(ext => ext.id.includes('posit'));
  console.log('[ENV] Positron environment?', found);
  return found;
}

export function registerInlineRepl(context: vscode.ExtensionContext) {
  // Show the inline REPL CodeLens in every file type / language, not just
  // Python and R. The CodeLens only appears where a `# >>>` block exists, so
  // this stays unobtrusive in files that don't contain inline REPL blocks.
  const selector: vscode.DocumentSelector = [
    { scheme: 'file' },
    { scheme: 'untitled' }
  ];

  // The language used to route execution is simply the document's language id.
  // In Positron this is passed straight to the matching runtime; languages
  // without a runtime fall back to a terminal.
  function detectLanguage(document: vscode.TextDocument): string {
    return document.languageId;
  }

  function parseReplBlockAt(
    document: vscode.TextDocument, lineNum: number):
    [number, null | {
      headerRange: vscode.Range,
      outputRange: vscode.Range,
      commands: string[],
      prefix: string
    }] {
    const { lineCount } = document;
    if (lineNum >= lineCount) return [lineNum, null];

    const headerLine = document.lineAt(lineNum);
    const header = headerLine.text.trimEnd();
    const headerRes = replPattern.exec(header);
    if (!headerRes) return [lineNum + 1, null];

    const headerLineNum = lineNum;
    const prefix = headerRes[1] || '';
    const commands: string[] = [];

    for (; lineNum < lineCount; lineNum++) {
      const line = document.lineAt(lineNum).text.trimEnd();
      const lineRes = replPattern.exec(line);
      if (line.startsWith(prefix) && lineRes !== null) {
        commands.push(lineRes[2]);
      } else {
        break;
      }
    }

    const outputLineNum = lineNum;

    for (; lineNum < lineCount; lineNum++) {
      const line = document.lineAt(lineNum).text.trimEnd();
      if (line === prefix.trim()) {
        lineNum++;
        break;
      }
      if (replPattern.test(line) || !line.startsWith(prefix)) break;
    }

    const headerRange = new vscode.Range(
      document.lineAt(headerLineNum).range.start,
      document.lineAt(Math.min(outputLineNum - 1, lineCount - 1)).range.end
    );

    const outputRange = new vscode.Range(
      document.lineAt(Math.min(outputLineNum, lineCount - 1)).range.start,
      outputLineNum === lineNum
        ? document.lineAt(Math.min(outputLineNum, lineCount - 1)).range.start
        : document.lineAt(Math.min(lineNum - 1, lineCount - 1)).range.end
    );

    return [lineNum, { headerRange, outputRange, commands, prefix }];
  }

  /**
   * Finds the inline REPL block that contains the given cursor line and returns
   * the line number of its header (the first `>>>` line), or null when the
   * cursor is not inside any inline REPL block. Used by the keyboard shortcut,
   * which has no CodeLens argument to tell it which block to run.
   */
  function findReplHeaderLineAtCursor(
    document: vscode.TextDocument,
    cursorLine: number
  ): number | null {
    const { lineCount } = document;
    for (let lineNum = 0; lineNum < lineCount;) {
      const [nextLine, res] = parseReplBlockAt(document, lineNum);
      lineNum = nextLine;
      if (res) {
        const blockStart = res.headerRange.start.line;
        const blockEnd = res.outputRange.end.line;
        if (cursorLine >= blockStart && cursorLine <= blockEnd) {
          return blockStart;
        }
      }
    }
    return null;
  }

  function generateReplacement(
    response: string,
    outputRange: vscode.Range,
    prefix: string
  ): string {
    if (!response || typeof response !== 'string') {
      console.warn('[REPL] Empty or invalid response passed to generateReplacement');
      return prefix.trim() + '\n'; // Fallback
    }

    let responseLines = response.split(/\r?\n/);
    if (responseLines[0] === '') responseLines.shift();
    if (responseLines[responseLines.length - 1] === '') responseLines.pop();

    const commentPrefix = prefix || '# ';
    const outputLines = responseLines.map(line =>
      commentPrefix + (line === '' ? '<BLANKLINE>' : line)
    );
    const end = outputRange.isEmpty ? '\n' : '';
    return outputLines.map(s => s + '\n').join('') + commentPrefix.trim() + end;
  }

  async function runInlineRepl(
    editor: vscode.TextEditor,
    _edit: vscode.TextEditorEdit,
    arg?: { headerLineNum: number; isRunning?: { flag: boolean } }
  ): Promise<void> {
    // From the CodeLens we get the block's header line. From a keyboard
    // shortcut there is no argument, so locate the inline REPL block that
    // contains the current cursor position instead.
    let headerLineNum: number;
    if (arg && typeof arg.headerLineNum === 'number') {
      headerLineNum = arg.headerLineNum;
    } else {
      const found = findReplHeaderLineAtCursor(editor.document, editor.selection.active.line);
      if (found === null) return;
      headerLineNum = found;
    }

    const isRunning = arg?.isRunning ?? { flag: false };
    if (isRunning.flag) return;
    isRunning.flag = true;

    const lang = detectLanguage(editor.document);

    const [, res] = parseReplBlockAt(editor.document, headerLineNum);
    if (!res) {
      isRunning.flag = false;
      return;
    }

    const { outputRange, commands, prefix } = res;
    const codeBlock = commands.join('\n');

    if (isRunningInPositron()) {
      let positron: any;
      try {
        positron = require('positron');
      } catch (err) {
        console.warn('[REPL] Positron not available.');
        isRunning.flag = false;
        return;
      }

      try {
        const result = await positron.runtime.executeCode(
          lang,
          codeBlock,
          false,
          undefined,
          positron.RuntimeCodeExecutionMode.Interactive
        );

        if (!result || typeof result.output !== 'string') {
          console.error('[REPL] Positron returned invalid output:', result);
          isRunning.flag = false;
          return;
        }

        const replacement = generateReplacement(result.output, outputRange, prefix);
        await editor.edit(e => e.replace(outputRange, replacement));
        isRunning.flag = false;
        return;
      } catch (e) {
        console.error('[REPL] Positron execution failed:', e);
      }
    }

    // ✅ FALLBACK TO TERMINAL
    try {
      const sendCodeToTerminal = (terminal: vscode.Terminal, lines: string[]) => {
        lines.forEach(line => terminal.sendText(line, true));
      };
    
      const codeLines = codeBlock.split(/\r?\n/);
    
      if (lang === 'r') {
        let rTerm = vscode.window.terminals.find(t => t.name.toLowerCase().includes('r'));
    
        if (rTerm) {
          rTerm.show();
          sendCodeToTerminal(rTerm, codeLines);
        } else {
          vscode.commands.executeCommand('r.createRTerm');
          // Wait a bit for terminal to start
          setTimeout(() => {
            const newRTerm = vscode.window.terminals.find(t => t.name.toLowerCase().includes('r'));
            if (newRTerm) {
              newRTerm.show();
              sendCodeToTerminal(newRTerm, codeLines);
            } else {
              vscode.window.showErrorMessage('[REPL] R terminal was not created.');
            }
          }, 1000);
        }
      } else if (lang === 'python') {
        let pyTerm = vscode.window.terminals.find(t => t.name.toLowerCase().includes('python'));
    
        if (pyTerm) {
          pyTerm.show();
          sendCodeToTerminal(pyTerm, codeLines);
        } else {
          const newTerm = vscode.window.createTerminal({ name: 'Python REPL' });
          newTerm.show();
          newTerm.sendText('python', true);
          setTimeout(() => {
            sendCodeToTerminal(newTerm, codeLines);
          }, 1000); // Give time for Python REPL to start
        }
      } else {
        // Fallback: send to default terminal
        const generic = vscode.window.createTerminal("Inline REPL");
        generic.show();
        sendCodeToTerminal(generic, codeLines);
      }
    
      // vscode.window.showInformationMessage(`[REPL] Code sent to terminal.`);
    } catch (termErr) {
      console.error('[REPL] Failed to send code to terminal:', termErr);
    } finally {
      isRunning.flag = false;
    }
  }

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'inline-repl.run',
      (editor, edit, arg) => {
        runInlineRepl(editor, edit, arg).catch(reportError('Inline REPL error'));
      }
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, {
      provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const lineCount = document.lineCount;

        for (let lineNum = 0; lineNum < lineCount;) {
          const [nextLine, res] = parseReplBlockAt(document, lineNum);
          lineNum = nextLine;
          if (res) {
            const command: vscode.Command = {
              title: '▶ Run Inline Code',
              command: 'inline-repl.run',
              arguments: [
                {
                  headerLineNum: res.headerRange.start.line,
                  isRunning: { flag: false }
                }
              ]
            };
            codeLenses.push(new vscode.CodeLens(res.headerRange, command));
          }
        }

        return codeLenses;
      }
    })
  );

  // Keep the `quarto-wingman.inlineReplActive` context key in sync with the
  // cursor position so the keyboard shortcut only overrides its key when the
  // cursor actually sits inside a `# >>>` block. This lets the shortcut work in
  // any language without hijacking the key everywhere else.
  const setReplContext = (editor: vscode.TextEditor | undefined): void => {
    const active =
      !!editor &&
      findReplHeaderLineAtCursor(editor.document, editor.selection.active.line) !== null;
    vscode.commands.executeCommand('setContext', 'quarto-wingman.inlineReplActive', active);
  };

  setReplContext(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(setReplContext),
    vscode.window.onDidChangeTextEditorSelection(e => setReplContext(e.textEditor)),
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) setReplContext(editor);
    })
  );
}
