"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInlineRepl = registerInlineRepl;
const vscode = __importStar(require("vscode"));
const positron = __importStar(require("positron"));
function reportError(msg) {
    return (err) => console.error(`${msg}: ${err}`);
}
const replPattern = /^(\s*#>?\s+)?>>>(.*)$/;
function registerInlineRepl(context) {
    const selector = [
        { language: 'python', scheme: 'file' },
        { language: 'r', scheme: 'file' }
    ];
    function detectLanguage(document) {
        const langId = document.languageId;
        if (langId === 'python')
            return 'python';
        if (langId === 'r')
            return 'r';
        return null;
    }
    function parseReplBlockAt(document, lineNum) {
        const { lineCount } = document;
        const headerLine = document.lineAt(lineNum);
        const header = headerLine.text.trimEnd();
        const headerRes = replPattern.exec(header);
        if (!headerRes)
            return [lineNum + 1, null];
        const headerLineNum = lineNum;
        const prefix = headerRes[1] || '';
        const commands = [];
        for (; lineNum < lineCount; lineNum++) {
            const line = document.lineAt(lineNum).text.trimEnd();
            const lineRes = replPattern.exec(line);
            if (line.startsWith(prefix) && lineRes !== null) {
                commands.push(lineRes[2]);
            }
            else {
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
            if (replPattern.test(line) || !line.startsWith(prefix))
                break;
        }
        const headerRange = new vscode.Range(document.lineAt(headerLineNum).range.start, document.lineAt(outputLineNum - 1).range.end);
        const outputRange = new vscode.Range(document.lineAt(outputLineNum).range.start, outputLineNum === lineNum
            ? document.lineAt(outputLineNum).range.start
            : document.lineAt(lineNum - 1).range.end);
        return [lineNum, { headerRange, outputRange, commands, prefix }];
    }
    function generateReplacement(response, outputRange, prefix) {
        let responseLines = response.split(/\r?\n/);
        if (responseLines[0] === '')
            responseLines.shift();
        if (responseLines[responseLines.length - 1] === '')
            responseLines.pop();
        const commentPrefix = prefix || '# ';
        const outputLines = responseLines.map(line => commentPrefix + (line === '' ? '<BLANKLINE>' : line));
        const end = outputRange.isEmpty ? '\n' : '';
        return outputLines.map(s => s + '\n').join('') + commentPrefix.trim() + end;
    }
    async function runInlineRepl(editor, edit, arg) {
        if (!arg)
            return;
        const { headerLineNum, isRunning } = arg;
        if (isRunning.flag)
            return;
        isRunning.flag = true;
        const lang = detectLanguage(editor.document);
        if (!lang)
            return;
        const [, res] = parseReplBlockAt(editor.document, headerLineNum);
        if (!res)
            return;
        const { outputRange, commands, prefix } = res;
        const codeBlock = commands.join('\n');
        try {
            const result = await positron.runtime.executeCode(lang, codeBlock, false, undefined, positron.RuntimeCodeExecutionMode.Interactive);
            const replacement = generateReplacement(result.output, outputRange, prefix);
            await editor.edit(e => e.replace(outputRange, replacement));
        }
        catch (e) {
            console.error('REPL execution failed:', e);
        }
        finally {
            isRunning.flag = false;
        }
    }
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('inline-repl.run', (editor, edit, arg) => {
        runInlineRepl(editor, edit, arg).catch(reportError('Inline REPL error'));
    }));
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(selector, {
        provideCodeLenses(document) {
            const codeLenses = [];
            const lineCount = document.lineCount;
            for (let lineNum = 0; lineNum < lineCount;) {
                const [nextLine, res] = parseReplBlockAt(document, lineNum);
                lineNum = nextLine;
                if (res) {
                    const command = {
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
    }));
}
//# sourceMappingURL=repl.js.map