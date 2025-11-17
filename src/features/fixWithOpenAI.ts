import * as vscode from 'vscode';
import OpenAI from "openai";
import { getSecret } from '../secretManager';


export async function fixWithOpenAI() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const selection = editor.selection;
  const source = editor.document.getText(selection);
  const instruction = await vscode.window.showInputBox({
    prompt: 'Enter instruction',
  });

  if (instruction) {
    const newCode = await fixCode(source, instruction);
    const startChar = selection.start.character;
    const indent = ' '.repeat(startChar);
    editor.edit(editBuilder => {
      editBuilder.replace(selection, newCode.split('\n').join('\n' + indent));
    });
  }
}

async function fixCode(source: string, instruction: string): Promise<string> {
  let ret = '';
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return ''; }

    const apiKey = await getSecret();
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: `
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
        `,
      max_output_tokens: 250,
    });

    const jsonString = response.output_text ?? '{}';
    const parsed = JSON.parse(jsonString);
    ret = parsed.fixed_code;
    const output = vscode.window.createOutputChannel("FixWithOpenAI");
    output.clear();
    output.appendLine(`[__________Replace__________]`);
    output.appendLine(`${source}`);
    output.appendLine(`[___________With___________]`);
    output.appendLine(`${ret}`);
    output.appendLine(`[_________Explanation_________]`);
    output.appendLine(`${parsed.explanation}`);
    output.show(true);

  } catch (err: any) {
    console.error('OpenAI call failed:', err);
    vscode.window.showErrorMessage(`OpenAI error: ${err.message ?? String(err)}`);
  }
  return ret;
}
