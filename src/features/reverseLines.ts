import * as vscode from 'vscode';

export function reverseLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const document = editor.document;

    const startLine = selection.start.line;
    const endLine = selection.end.line;

    const lines: string[] = [];

    for (let i = startLine; i <= endLine; i++) {
        lines.push(document.lineAt(i).text);
    }

    const reversed = lines.reverse().join('\n');

    const range = new vscode.Range(
        startLine, 0,
        endLine, document.lineAt(endLine).text.length
    );

    editor.edit(editBuilder => {
        editBuilder.replace(range, reversed);
    });
}