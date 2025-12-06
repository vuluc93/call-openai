import * as vscode from 'vscode';
import { fetchWithTimer } from '../utils';
import { openTempEditor } from '../memoryFsManager';

let previousEditor: vscode.TextEditor | null = null;

export async function shortAnswer() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  if (editor?.document.uri.scheme === "tempinput") {
    const text = editor.document.getText();
    // console.log("USER INPUT:", text);
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");

    if (previousEditor) {
      await vscode.window.showTextDocument(previousEditor.document);
      await handleAnswer(text);
    }
    return;
  }

  previousEditor = editor!;
  await openTempEditor('');
}

async function handleAnswer(input: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const selection = editor.selection;
  const source = editor.document.getText(selection);
  const match = input.match(/^=+/); 
  const count = match ? match[0].length : source ? 2 : 0;
  const question = input.replace(/^=+/, '');
  const max_tokens = 50 * 4 ** count;

  let rules = '';
  if (count === 0) {
    rules = `Trả lời siêu ngắn gọn trong 1 câu.
      Câu hỏi: `;
  } else if (count === 1) {
    rules = `Hãy trả lời ngắn gọn, giải thích sơ qua nếu cần thiết, không vượt quá 100 từ.
      Câu hỏi: `;
  } else if (source) {
    rules = `Với đoạn code ${editor?.document.languageId}:
      ${source}
      Câu hỏi: `;
  }
  
  const prompt = `${rules}${question}?`;
  const output = vscode.window.createOutputChannel("ShortAnswer");
  output.clear();
  output.appendLine(`[__________question__________]`);
  output.appendLine(`${question}`);
  output.show(true);

  await fetchWithTimer(prompt, async (jsonString) => {
    output.appendLine(`\n[___________answer___________]`);
    output.appendLine(`${jsonString}`);
  }, max_tokens);
}
