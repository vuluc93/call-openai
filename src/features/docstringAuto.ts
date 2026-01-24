import * as vscode from 'vscode';
import {
  extractListFunctions,
  findFunctionBlockByName,
} from './listFunctions';
import { fetchWithTimer, extractJson } from '../utils';

export async function docstringAuto() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
      vscode.window.showErrorMessage('No active editor!');
      return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);

  const textToProcess = selectedText && selectedText.trim() !== ""
      ? selectedText : editor.document.getText();

  const output = vscode.window.createOutputChannel("ListFunctions");
    output.clear();
    output.show(true);

  const languageId = editor?.document.languageId;
	const listFuncs = extractListFunctions(textToProcess);
  const mapInput: { [key: string]: string } = {};
  const mapName: { [key: string]: string } = {};

  if (listFuncs.length > 0) {
    for (let i = 0; i < listFuncs.length; i++) {
      mapInput[i.toString()] = listFuncs[i].content.split('\n').filter(line => line.trim() !== '').join('\n').trim();
      mapName[i.toString()] = listFuncs[i].name;
    }
  }

  let prompt = '';
  if (languageId === 'typescript') {
    prompt = `
      All functions provided below are written in typescript.
      Your task:
      - Generate a TypeScript JSDoc docstring in English for each function.
      - Start with a one-line summary describing the function's purpose.
      - After the summary, insert exactly one blank line.
      - Then output all parameters using: @param {Type} name - description
      - Then output the return type using: @returns {Type} description
      - Infer correct TypeScript types (number, string, boolean, GC.Spread.Sheets.Worksheet, void, Promise<void>, etc.)
      - Only generate the docstring text (do NOT include /** */, /* */, or //).
      - Do NOT modify the function code.
    `;
  } else if (languageId === 'python') {
    prompt = `
      All functions provided below are written in python.
      Your task:
      - Generate a Python docstring in English for each function using Google-style format.
      - Start with a one-line summary, then a blank line.
      - Use:
          Args:
            name (type): description
          Returns:
            type: description
      - Infer correct Python types (str, int, float, list[dict], date, etc.)
      - Only generate the docstring text (do NOT include triple quotes).
      - Do NOT modify the function code.
    `;
  }

  await fetchWithTimer(`${prompt}

    Input:
    An object where each key is an ID and the value is the function code (string, no docstring included).

    Return:
    A JSON object where each key is the same ID and each value is the generated docstring as a plain string.
    Output valid JSON only.

    Now process:
    ${JSON.stringify(mapInput, null, 2)}
  `, async (response) => {
    const output = vscode.window.createOutputChannel("FixWithOpenAI");
    output.clear();
    output.appendLine(`[__________Response__________]`);
    output.show(true);

    // let cleanResponse = response.trim();
    const parsed = JSON.parse(extractJson(response))
    // const parsed = JSON.parse(cleanResponse);

    for (const key in parsed) {
      const docstring = parsed[key];
      const funcName = mapName[key];
      const func = findFunctionBlockByName(funcName);
      if (func) {
        output.appendLine(`\n_____Function: <${func.name}>_____`);
        const docBlock = createDocBlock(docstring, func.indent, languageId);
        output.appendLine(`_____Docstring_____\n${docstring}`);
        await editor.edit(editBuilder => {
          const start = new vscode.Position(func.blockStart, 0);
          const lines = func.content.split('\n');

          if (languageId === 'python') {
            const end = new vscode.Position(func.blockEnd + 2 - lines.length, 0);
            const newContent = `${lines[0]}\n${docBlock}\n`;
            editBuilder.replace(new vscode.Range(start, end), newContent);
          } else {
            const end = new vscode.Position(func.blockEnd + 1 - lines.length, 0);
            const newContent = `${docBlock}\n`;
            editBuilder.replace(new vscode.Range(start, end), newContent);
          }
        });
      }
    }
  }, 4096);
}

function createDocBlock(doc: string, indent: string, languageId: string) {
  if (languageId === 'typescript') {
    const docLines = doc.split("\n").map(line => line.trim());
    const content = docLines.map(l => l ? `${indent} * ${l}` : `${indent} *`).join("\n");
    return `${indent}/**\n${content}\n${indent} */`;
  }
  if (languageId === 'python') {
    const pyIndent = '    ' + indent;
    const content = doc.split("\n").map(l => l ? `${pyIndent}${l}` : ``).join("\n");
    return `${pyIndent}"""\n${content}\n${pyIndent}"""`;
  }
  return doc.split('\n').join('\n' + indent);
}
