import * as vscode from 'vscode';
import { fetchWithTimer } from '../utils';

export async function shortAnswer() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const question = await vscode.window.showInputBox({
    prompt: 'Enter question',
  });

  const selection = editor.selection;
  const source = editor.document.getText(selection);
  if (question) {
    if (source) {
      await fetchWithTimer(`
          Trả lời ngắn gọn trong 1-2 câu. Với đoạn code:
          ${source}
          Câu hỏi: ${question}?
      `, async (jsonString) => {
        const output = vscode.window.createOutputChannel("ShortAnswer");
        output.clear();
        output.appendLine(`[__________Question__________]`);
        output.appendLine(`${question}`);
        output.appendLine(`[___________Answer___________]`);
        output.appendLine(`${jsonString}`);
        output.show(true);
      });
    } else {
      await fetchWithTimer(`
          Trả lời siêu ngắn gọn trong 1 câu.
          Câu hỏi: ${question}?
      `, async (jsonString) => {
        const output = vscode.window.createOutputChannel("ShortAnswer");
        output.clear();
        output.appendLine(`[__________Question__________]`);
        output.appendLine(`${question}`);
        output.appendLine(`[___________Answer___________]`);
        output.appendLine(`${jsonString}`);
        output.show(true);
      });
    }
  }
}
