import * as vscode from 'vscode';

export async function pasteMultiTimes() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      vscode.window.showInformationMessage('Please select some text first.');
      return;
    }

    const input = await vscode.window.showInputBox({
      prompt: 'Enter number of times to paste',
      validateInput: (val) => {
        return isNaN(Number(val)) || Number(val) <= 0 ? 'Please enter a positive number' : null;
      }
    });

    if (!input) {
      return;
    }

    const times = Number(input);

    // Lấy vị trí dòng bắt đầu của selection
    const startChar = selection.start.character;

    // Tạo chuỗi lặp, giữ nguyên indent
    const indent = ' '.repeat(startChar);
    const repeated = Array(times).fill(selectedText).join('\n' + indent);

    editor.edit(editBuilder => {
      // thay thế bằng text lặp, vẫn giữ indent
      editBuilder.replace(selection, repeated);
    });
}