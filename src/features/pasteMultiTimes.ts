import * as vscode from 'vscode';

export async function pasteMultiTimes() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);

  if (!selectedText) {
    const line = selection.active.line;
    const document = editor.document;

    const currentLine = document.lineAt(line);
    const currentText = currentLine.text;

    const trimmed = currentText.trim();

    // Detect line đã comment chưa
    const isCommented =
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith(';');

    // --------------------------------
    // CASE 1: dòng chưa comment
    // -> comment dòng hiện tại
    // -> clone xuống dưới
    // --------------------------------
    if (!isCommented) {
      await vscode.commands.executeCommand(
        'editor.action.commentLine'
      );

      await editor.edit(editBuilder => {
        editBuilder.insert(
          new vscode.Position(line + 1, 0),
          currentText + '\n'
        );
      });

      // move cursor xuống dòng clone
      const newPos = new vscode.Position(line + 1, currentLine.firstNonWhitespaceCharacterIndex);
      editor.selection = new vscode.Selection(newPos, newPos);
      return;
    }

    // --------------------------------
    // CASE 2: dòng hiện tại đã comment
    // -> uncomment dòng hiện tại
    // -> toggle comment dòng dưới
    // --------------------------------
    else {
      await vscode.commands.executeCommand(
        'editor.action.commentLine'
      );

      // nếu có dòng tiếp theo
      if (line + 1 < document.lineCount) {
        const nextLine = line + 1;

        editor.selection = new vscode.Selection(
          new vscode.Position(nextLine, 0),
          new vscode.Position(nextLine, 0)
        );

        await vscode.commands.executeCommand(
          'editor.action.commentLine'
        );

        const pos = new vscode.Position(line, document.lineAt(line).firstNonWhitespaceCharacterIndex);
        editor.selection = new vscode.Selection(pos, pos);
      }

      return;
    }
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