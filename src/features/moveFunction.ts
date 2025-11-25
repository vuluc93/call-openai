import * as vscode from 'vscode';
import {
  extractListFunctions,
  findFunctionBlockByName,
} from './listFunctions';

export async function moveFunction() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor!');
    return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);

  const output = vscode.window.createOutputChannel("MoveFunction");
  output.clear();
  output.show(true);

  if (selectedText && selectedText.trim() !== '') {
    // const func = findFunctionBlockByName(selectedText);
    //     output.appendLine(`blockStart: ${func?.blockStart}`);
    // output.appendLine(`blockEnd: ${func?.blockEnd}`);
    // output.appendLine(`indent: ${func?.indent}.`);
    // output.appendLine(`content: ${func?.content}`);
  } else {
    const allText = editor.document.getText();
    const listFuncs = extractListFunctions(allText);
    const line = editor.selection.active.line;
    const nextFunc = listFuncs.find(item => item.blockStart > line);
    if (nextFunc) {
        goToLine(nextFunc.blockStart)
    }
  }
}

function goToLine(line: number) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const position = new vscode.Position(line, 0);

    // Move cursor
    editor.selection = new vscode.Selection(position, position);

    // Scroll & focus to the line
    editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
    );

    // Focus vào editor (nếu cần)
    vscode.window.showTextDocument(editor.document, { preview: false });
}
