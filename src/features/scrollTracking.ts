import * as vscode from 'vscode';
import * as fs from 'node:fs';
import os from "os";
import { bottomProvider, sideProvider } from '../previewProvider';
import { extractListFunctions, FunctionInfo } from './listFunctions';

let watcher: fs.FSWatcher | null = null;
let targetLine: number
const CONTEXT_RANGE = 3;
const tmpFilePath = `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Temp\\vscode_scroll.tmp`;

function updateBottomInfo(listFuncs: FunctionInfo[], targetLine: number) {
    const editor = vscode.window.activeTextEditor;
        if (!editor) return {};

    const document = editor.document;
    const totalLines = document.lineCount;


    const startLine = Math.max(0, targetLine - CONTEXT_RANGE);
    const endLine = Math.min(totalLines - 1, targetLine + CONTEXT_RANGE);
    
    const contextLines = [];
    for (let i = startLine; i <= endLine; i++) {
        contextLines.push({
            number: i + 1,
            text: document.lineAt(i).text,
            isTarget: i === targetLine
        });
    }

    const curFunc = [...listFuncs].reverse().find(item => item.blockStart <= targetLine);
    bottomProvider.update(curFunc?.start || 0, curFunc?.name || 'Global', contextLines)
}

export function updateSideInfo(listFuncs: FunctionInfo[], targetLine: number) {
    const editor = vscode.window.activeTextEditor;
        if (!editor) return {};

    const contextLines = [];
    let curFuncName: string = 'Global'
    if (listFuncs.length) {
        const curFunc = [...listFuncs].reverse().find(item => item.blockStart <= targetLine);
        curFuncName = curFunc?.name || 'No function'
    }

    let index = 1;
    for (const func of listFuncs) {
        const match = func.name.match(/-+\s*(.*?)\s*-+/)
        const displayName = match ? match[1].trim() : func.name;
    
        contextLines.push({
            number: index,
            text: displayName,
            isTarget: func.name === curFuncName,
            linkNumber: func.start,
        });
        index++;
    }

    sideProvider.update(targetLine + 1, editor.document.lineAt(targetLine).text, contextLines)
}

export function startScrollTracking() {
    if (watcher) return;
    const editor = vscode.window.activeTextEditor;
    if (!editor) return {};
    const originalLine = editor.selection.active.line
    // vscode.commands.executeCommand('setContext', 'g502PreviewEnabled', true);

    const totalLines = editor.document.lineCount;
    const listFuncs = extractListFunctions(editor.document.getText());

    watcher = fs.watch(tmpFilePath, (eventType) => {
        if (eventType === 'change') {
            try {
                const content = fs.readFileSync(tmpFilePath, 'utf8');
                const ratio = parseFloat(content);
                if (!isNaN(ratio)) {
                    targetLine = Math.round(
                        ratio <= 0
                            ? (ratio + 1) * originalLine
                            : originalLine + ratio * ((totalLines - 1) - originalLine)
                    );

                    updateBottomInfo(listFuncs, targetLine)
                    updateSideInfo(listFuncs, targetLine)
                }
            } catch (e) {
                // Xử lý khi file bị lock tạm thời
            }
        }
    });
}

export function stopScrollTracking() {
    watcher?.close();
    watcher = null;
    vscode.commands.executeCommand('workbench.action.terminal.focus')
    goToLine(targetLine)
}

export function goToLine(targetLine?: number) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const line = targetLine ?? editor.selection.active.line;
        const pos = new vscode.Position(line, 0);

        editor.revealRange(
            new vscode.Range(pos, pos),
            vscode.TextEditorRevealType.InCenter
        );

        editor.selection = new vscode.Selection(pos, pos);
        vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        const listFuncs = extractListFunctions(editor.document.getText());
        updateSideInfo(listFuncs, line)
    }
}

