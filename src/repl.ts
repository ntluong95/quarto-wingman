import * as vscode from 'vscode';
import * as positron from 'positron';

function reportError(msg: string) {
    return (err: string) => console.error(`${msg}: ${err}`);
}

const replPattern = /^(\s*#>?\s+)?>>>(.*)$/;

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
            document.lineAt(outputLineNum - 1).range.end
        );

        const outputRange = new vscode.Range(
            document.lineAt(outputLineNum).range.start,
            outputLineNum === lineNum
                ? document.lineAt(outputLineNum).range.start
                : document.lineAt(lineNum - 1).range.end
        );

        return [lineNum, { headerRange, outputRange, commands, prefix }];
    }

    function generateReplacement(
        response: string,
        outputRange: vscode.Range,
        prefix: string
    ): string {
        let responseLines = response.split(/\r?\n/);
        if (responseLines[0] === '') responseLines.shift();
        if (responseLines[responseLines.length - 1] === '') responseLines.pop();
        const commentPrefix = prefix || '# ';
        const outputLines = responseLines.map(line => commentPrefix + (line === '' ? '<BLANKLINE>' : line));
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
        if (!lang) return;

        const [, res] = parseReplBlockAt(editor.document, headerLineNum);
        if (!res) return;
        const { outputRange, commands, prefix } = res;

        const codeBlock = commands.join('\n');

        try {
            const result = await positron.runtime.executeCode(
                lang,
                codeBlock,
                false,
                undefined,
                positron.RuntimeCodeExecutionMode.Interactive
            );

            const replacement = generateReplacement(result.output, outputRange, prefix);
            await editor.edit(e => e.replace(outputRange, replacement));
        } catch (e) {
            console.error('REPL execution failed:', e);
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
