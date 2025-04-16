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
  const selector: vscode.DocumentSelector = [
    { language: 'python', scheme: 'file' },
    { language: 'r', scheme: 'file' }
  ];

  function detectLanguage(document: vscode.TextDocument): 'python' | 'r' | null {
    const langId = document.languageId;
    if (langId === 'python') return 'python';
    if (langId === 'r') return 'r';
    return null;
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
    edit: vscode.TextEditorEdit,
    arg?: { headerLineNum: number; isRunning: { flag: boolean } }
  ): Promise<void> {
    if (!arg) return;
    const { headerLineNum, isRunning } = arg;
    if (isRunning.flag) return;
    isRunning.flag = true;

    const lang = detectLanguage(editor.document);
    if (!lang) {
      isRunning.flag = false;
      return;
    }

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
}
