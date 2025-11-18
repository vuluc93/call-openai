import * as vscode from 'vscode';

export interface TSFunctionInfo {
  name: string;
  code: string;
  start: number;
  end: number;

  docStart: number;
  docEnd: number;
  docLines: number;
}

export function docstringFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor!');
        return;
    }

    const doc = editor.document;
    const text = doc.getText();
    const listFunction = extractTSFunctions(text);
    console.log('listFunction', listFunction);
}

export function extractTSFunctions(content: string): TSFunctionInfo[] {
  const lines = content.split("\n");
  const functions: TSFunctionInfo[] = [];

  // Regex cho function / async function
  const fnRegex =
    /^\s*(async\s+)?function\s+(\w+)\s*\((.*?)\)\s*\{/;

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(fnRegex);

    if (!match) {
      i++;
      continue;
    }

    const name = match[2];
    const fnStart = i;

    let docStart = -1;
    let docEnd = -1;
    let docLines = 0;

    let k = i - 1;
    if (k >= 0 && lines[k].trim().startsWith("/**")) {
      docStart = k;

      while (k >= 0 && !lines[k].trim().endsWith("*/")) {
        k++;
      }

      // Tìm end từ docStart xuống
      let d = docStart;
      while (d < i && !lines[d].includes("*/")) {
        d++;
      }
      docEnd = d;
      docLines = docEnd - docStart + 1;
    }

    let braceCount =
      (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

    let j = i + 1;
    while (j < lines.length && braceCount > 0) {
      const ln = lines[j];
      braceCount += (ln.match(/{/g) || []).length;
      braceCount -= (ln.match(/}/g) || []).length;
      j++;
    }

    const fnEnd = j - 1;
    const code = lines.slice(fnStart, fnEnd + 1).join("\n");

    functions.push({
      name,
      code,
      start: fnStart,
      end: fnEnd,
      docStart,
      docEnd,
      docLines,
    });

    i = fnEnd + 1;
  }

  return functions;
}
