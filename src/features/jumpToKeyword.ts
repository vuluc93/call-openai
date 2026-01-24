import * as vscode from 'vscode';
import * as fs from 'node:fs';
import os from "os";

let lastMatchIndex = -1;

export function jumpToKeyword(index: number): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const configPath = `C:\\Users\\${os.userInfo().username}\\ProcessFiles\\keyword.json`;
    const output = vscode.window.createOutputChannel("JumpToKeyword");
    output.clear();
    output.appendLine(`ConfigPath:  ${configPath}`);
    const raw = fs.readFileSync(configPath, 'utf-8');
    const dictWords: Record<number, string> = JSON.parse(raw);
    const keyword = dictWords[index]

    const doc = editor.document;
    const text = doc.getText();

    const matches: vscode.Position[] = [];
    const lines = text.split('\n');

    lines.forEach((line, lineNumber) => {
        const col = line.indexOf(keyword);
        if (col !== -1) {
            matches.push(new vscode.Position(lineNumber, col));
        }
    });

    if (matches.length === 0) return;

    lastMatchIndex = (lastMatchIndex + 1) % matches.length;
    const pos = matches[lastMatchIndex];

    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(
        new vscode.Range(pos, pos),
        vscode.TextEditorRevealType.InCenter
    );
}
