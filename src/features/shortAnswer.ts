import * as vscode from 'vscode';
import { fetchWithTimer } from '../utils';

export async function shortAnswer() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const input = await vscode.window.showInputBox({
    prompt: 'Enter question',
  });

  const selection = editor.selection;
  const source = editor.document.getText(selection);
  if (input) {
    const match = input.match(/^=+/); 
    const count = match ? match[0].length : source ? 1 : 0;
    const question = input.replace(/^=+/, '');
    const max_tokens = 50 * 4 ** count;

    const rules = count === 0 ?
      `Trả lời siêu ngắn gọn trong 1 câu.
        Câu hỏi: `
      : source ? `Với đoạn code ${editor?.document.languageId}:
        ${source}
        Câu hỏi: `
        : ''
    const prompt = `${rules}${question}?`
    await fetchWithTimer(prompt, async (jsonString) => {
      outputShow(question, jsonString)
    }, max_tokens);
  }
}

function outputShow(question: string, jsonString: string) {
  const output = vscode.window.createOutputChannel("ShortAnswer");
  output.clear();
  output.appendLine(`[__________Question__________]`);
  output.appendLine(`${question}`);
  output.appendLine(`[___________Answer___________]`);
  output.appendLine(`${jsonString}`);
  output.show(true);
}
