import * as vscode from 'vscode';
import * as path from 'path';
import * as process from 'process';

export async function pasteFromTerminal() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const filePath = path.join(process.env.TEMP || '', 'al', 'output.txt');
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
        const item = content.toString();

        await editor.edit(edit => {
            edit.replace(editor.selection, item);
        });

        vscode.window.showInformationMessage('Content replaced successfully');
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading file: ${error}`);
    }
}
