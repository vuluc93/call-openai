import * as vscode from 'vscode';
import {
  extractListFunctions,
  findFunctionBlockByName,
} from './listFunctions';
import { fetchWithTimer } from '../utils';

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
      mapInput[i.toString()] = listFuncs[i].content;
      mapName[i.toString()] = listFuncs[i].name;
    }
  }
  // output.appendLine(JSON.stringify(input, null, 2))

  await fetchWithTimer(`
    All functions provided below are written in ${languageId}.
    Your task:
    - For each function, generate a ${languageId}-style docstring in English.
    - Clearly describe all parameters and their types.
    - Clearly describe the return type.
    - Do NOT modify the function code.
    - Only generate the docstring text.
    - Do NOT include /** */, /* */, // or any comment markers.

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

    let cleanResponse = response.trim();
    const parsed = JSON.parse(cleanResponse);    
    // if (cleanResponse.startsWith('```')) {
      //   cleanResponse = cleanResponse.replace(/^```[a-zA-Z0-9]*\n/, '').replace(/\n```$/, '');
      // }
    for (const key in parsed) {
      const docstring = parsed[key];
      const funcName = mapName[key];
      const func = findFunctionBlockByName(funcName);
      if (func) {
        output.appendLine(`\n_____Function: ${func.name}_____`);
        // const indent = func.content?.split("\n")[0].match(/^(\s*)/)?.[1] ?? "";
        const docBlock = createDocBlock(docstring, func.indent, languageId);
        output.appendLine(`_____Docstring:_____\n${docstring}`);
        await editor.edit(editBuilder => {
          const start = new vscode.Position(func.blockStart, 0);
          const end = new vscode.Position(func.blockEnd + 1, 0);
          if (languageId === 'python') {
            const lines = func.content.split('\n');
            editBuilder.replace(new vscode.Range(start, end), `${lines[0]}\n${docBlock}\n${lines.slice(1).join('\n')}\n`);
          } else {
            editBuilder.replace(new vscode.Range(start, end), `${docBlock}\n${func.content}\n`);
          }
        });
      }
    }
  }, 3200);
}

function createDocBlock(doc: string, indent: string, languageId: string): string {
  if (languageId === 'typescript') {
    const docLines = doc.split("\n").map(line => line.trim());
    const content = docLines.map(l => `${indent} * ${l}`).join("\n");
    return `${indent}/**\n${content}\n${indent} */`;
  }
  if (languageId === 'python') {
    return `${indent}"""\n${doc.split('\n').join('\n' + indent)}\n${indent}"""`;
  }
  return doc.split('\n').join('\n' + indent);
}
