import * as vscode from 'vscode';

export function insertLoggerDebug() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection).trim();
    if (!selectedText) { return; }

    const document = editor.document;
    const language = document.languageId;
    let logLine: string;
    if (language === "javascript" || language === "vue" || language === "typescript") {
      // Nếu là JS/TS/Vue
      logLine = `console.log('${selectedText}', ${selectedText})`;
    } else if (language === "csharp") {
      // Nếu là C#
      logLine = `Console.WriteLine($"${selectedText}: {${selectedText}}");`;
    } else {
      // Nếu là Python
      const timestamp = Date.now();
      logLine = `logger.debug(f'debug_${timestamp}: {${selectedText}}')`;
    }

    editor.edit(editBuilder => {
      const line = editor.document.lineAt(selection.start.line);

      // 👉 lấy indent của dòng tiếp theo (nếu có)
      let indent = 0;
      if (line.lineNumber + 1 < editor.document.lineCount) {
        const nextLine = editor.document.lineAt(line.lineNumber + 1);
        indent = nextLine.firstNonWhitespaceCharacterIndex;
      } else {
        // nếu không có dòng tiếp theo thì lấy indent của dòng hiện tại
        indent = line.firstNonWhitespaceCharacterIndex + 4; // giả sử indent 4 spaces
      }

      const insertPosition = new vscode.Position(line.lineNumber + 1, 0);
      editBuilder.insert(insertPosition, " ".repeat(indent) + logLine + '\n');
    });
}