import * as vscode from 'vscode';
import OpenAI from "openai";
import { getSecret } from '../secretManager';
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
    await fetchWithTimer(async () => {
      if (source) {
        await answerWithCode(source, question);
      } else {
        await answer(question);
      }
    });
  }
}

async function answer(question: string): Promise<void> {
  try {
    const apiKey = await getSecret();
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: `
        Trả lời siêu ngắn gọn trong 1 câu.
        Câu hỏi: ${question}?
        `,			
      // max_output_tokens: 200
      });

    const jsonString = response.output_text ?? '{}';
    const output = vscode.window.createOutputChannel("ShortAnswer");
    output.clear();
    output.appendLine(`[__________Question__________]`);
    output.appendLine(`${question}`);
    output.appendLine(`[___________Answer___________]`);
    output.appendLine(`${jsonString}`);
    output.show(true);

  } catch (err: any) {
    console.error('OpenAI call failed:', err);
    vscode.window.showErrorMessage(`OpenAI error: ${err.message ?? String(err)}`);
  }
}

async function answerWithCode(code: string, question: string): Promise<void> {
  try {
    const apiKey = await getSecret();
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: `
        Trả lời ngắn gọn trong 1-2 câu. Với đoạn code:
        ${code}
        Câu hỏi: ${question}?
        `,			
      // max_output_tokens: 200
      });

    const jsonString = response.output_text ?? '{}';
    const output = vscode.window.createOutputChannel("ShortAnswer");
    output.clear();
    output.appendLine(`[__________Question__________]`);
    output.appendLine(`${question}`);
    output.appendLine(`[___________Answer___________]`);
    output.appendLine(`${jsonString}`);
    output.show(true);

  } catch (err: any) {
    console.error('OpenAI call failed:', err);
    vscode.window.showErrorMessage(`OpenAI error: ${err.message ?? String(err)}`);
  }
}
