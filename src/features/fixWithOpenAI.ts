import * as vscode from 'vscode';
import { fetchWithTimer } from '../utils';


export async function fixWithOpenAI() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const selection = editor.selection;
  const source = editor.document.getText(selection);
  const instruction = await vscode.window.showInputBox({
    prompt: 'Enter instruction',
  });

  if (instruction) {
    await fetchWithTimer(`
        Bạn là trợ lý sửa code ${editor?.document.languageId}.
        Dưới đây là đoạn code cần sửa, luôn giữ nguyên code gốc nhiều nhất có thể:
        ${source}
        Yêu cầu sửa: ${instruction}

        Hãy trả về kết quả dưới dạng JSON như sau:
        {
          "fixed_code": "<code đã sửa>",
          "explanation": "<giải thích ngắn gọn hoặc để trống>"
        }

        Chỉ trả về JSON, không thêm lời giải thích khác.
    `, async (jsonString) => {
      const parsed = JSON.parse(jsonString);
      const newCode = parsed.fixed_code;

      const startChar = selection.start.character;
      const indent = ' '.repeat(startChar);
      editor.edit(editBuilder => {
        editBuilder.replace(selection, newCode.split('\n').join('\n' + indent));
      });

      const output = vscode.window.createOutputChannel("FixWithOpenAI");
      output.clear();
      output.appendLine(`[__________Replace__________]`);
      output.appendLine(`${source}`);
      output.appendLine(`[___________With___________]`);
      output.appendLine(`${newCode}`);
      output.appendLine(`[_________Explanation_________]`);
      output.appendLine(`${parsed.explanation}`);
      output.show(true);
    });
  }
}
