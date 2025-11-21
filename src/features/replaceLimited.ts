import * as vscode from "vscode";

export async function replaceLimited() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    const startOffset = editor.document.offsetAt(selection.start);

    // Input text thay thế, default là selection
    const replaceText = await vscode.window.showInputBox({
      prompt: 'Text to replace selection with',
      value: selectedText
    });
    if (replaceText === undefined) { return; }

    // Input số lần replace, default 3
    const countStr = await vscode.window.showInputBox({
      prompt: 'Number of times to replace',
      value: '1',
      validateInput: (value) => isNaN(Number(value)) ? 'Must be a number' : null
    });
    // if (countStr === undefined) { return; }

    const count = countStr === '' ? 100 : Number(countStr);
    if (count <= 0) { return; }

    const docText = editor.document.getText();

    // Phần trước selection giữ nguyên
    let replacedText = docText.slice(0, startOffset);

    // Phần từ selection trở đi
    let remaining = docText.slice(startOffset);

    let n = 0;
    while (n < count) {
      const index = remaining.indexOf(selectedText); // tìm selection
      if (index === -1) { break; }
      replacedText += remaining.slice(0, index) + replaceText; // thay bằng replaceText
      remaining = remaining.slice(index + selectedText.length);
      n++;
    }

    // Thêm phần còn lại
    replacedText += remaining;

    // Apply edit
    await editor.edit(editBuilder => {
      const start = new vscode.Position(0, 0);
      const end = new vscode.Position(editor.document.lineCount, 0);
      editBuilder.replace(new vscode.Range(start, end), replacedText);
    });

    vscode.window.showInformationMessage(`Replaced ${n} occurrence(s) starting from selection`);
}