import * as vscode from 'vscode';
import { fetchWithTimer } from '../utils';
import { openTempEditor } from '../memoryFsManager';
import { normalizeText, simpleCharReplace } from './simpleCheckReplace';

let previousEditor: vscode.TextEditor | null = null;

export async function inputBox() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const selection = editor.selection;
    const source = editor.document.getText(selection);
    const input = await vscode.window.showInputBox({
      prompt: source ? 'Enter instruction' : 'Enter question',
    });
    
    if (input) {
        if (source) {
            await fixWithOpenAI(input, selection);
        } else {
            await handleAnswer(input);
        }
    }
}

export async function inputMutilLines() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  if (editor?.document.uri.scheme === "tempinput") {
    const text = editor.document.getText();
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");

    if (previousEditor) {
      await vscode.window.showTextDocument(previousEditor.document);
      const selection = previousEditor.selection;
      const source = previousEditor.document.getText(selection);

      const match = text.match(/_____input_____\s*([\s\S]*)$/);
      const input = match ? match[1] : '';
      if (input) {
        if (source && input.startsWith('>')) {
          const instruction = input.replace(/^>/, '');
          await fixWithOpenAI(instruction, selection);
        } else {
          await handleAnswer(input, source);
        }
      }
    }
    return;
  }

  previousEditor = editor!;
  const selection = previousEditor.selection;
  const source = previousEditor.document.getText(selection);
  await openTempEditor(`${source}\n_____input_____\n`);
}

async function handleAnswer(input: string, source?: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

//   const selection = editor.selection;
//   const source = editor.document.getText(selection);
  const match = input.match(/^[=']+/); 
  const count = match ? match[0].length : source ? 2 : 0;
  const question = input.replace(/^[=']+/, '');
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

async function fixWithOpenAI(instruction: string, selection: vscode.Selection) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const source = editor.document.getText(selection);
  const output = vscode.window.createOutputChannel("FixWithOpenAI");
  output.clear();
  output.appendLine(`[_________instruction_________]`);
  output.appendLine(`${instruction}`);
  output.show(true);

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

    const replaceResult = simpleCharReplace(normalizeText(source), normalizeText(newCode), 1000)
    output.appendLine(`\n[__________replace__________]`);
    output.appendLine(`${replaceResult.X}`);
    output.appendLine(`\n[___________with___________]`);
    output.appendLine(`${replaceResult.Y}`);
    output.appendLine(`\n[_________explanation_________]`);
    output.appendLine(`${parsed.explanation}`);
  });
}
