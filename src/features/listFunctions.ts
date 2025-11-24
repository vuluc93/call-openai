import * as vscode from 'vscode';

export interface FunctionInfo {
  name: string;
  code: string;
  start: number;
  end: number;
  indent: string;

  content: string;
  docStart: number;
  docEnd: number;
  blockStart: number;
  blockEnd: number;
}

function extractPyFunctions(content: string): FunctionInfo[] {
  const lines = content.split("\n");
  const functions: FunctionInfo[] = [];

//   const defRegex = /^(\s*)def\s+([A-Za-z0-9_]+)\s*\((.*)\):/;
  const defRegex = /^(\s*)def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(defRegex);
    if (!match) {
      i++;
      continue;
    }

    const indent = match[1];
    const name = match[2];

    let docStart = -1;
    let docEnd = -1;

    let start = i;
    let j = i + 1;

    while (
      j < lines.length &&
      (lines[j].startsWith(indent + " ") || lines[j].trim() === "")
    ) {
      j++;
    }

    const end = j - 1;
    let code = lines.slice(start, end + 1).join("\n");

    // Extract docstring triple-quote
    const docRegex = /(""".*?""")|('''.*?''')/s;
    const codeWithoutDoc = code.replace(docRegex, "").split('\n').filter(line => line.trim() !== '').join('\n').trim();

    functions.push({
      name,
      code,
      content: codeWithoutDoc,
      start,
      end,
      indent,
      docStart,
      docEnd,
      blockStart: start,
      blockEnd: end,
    });

    i = end + 1;
  }

  return functions;
}

function extractTSFunctions(content: string): FunctionInfo[] {
  const lines = content.split("\n");
  const functions: FunctionInfo[] = [];

  // Nhận dạng function header
  const fnHeaderRegex =
    /^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*\(/;

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(fnHeaderRegex);
    if (!match) {
      i++;
      continue;
    }

    const indent = match[1];
    const name = match[3];
    const fnStart = i;

    // =====================================
    // Tìm docstring kiểu /** ... */ phía trên
    // =====================================
    let docStart = -1;
    let docEnd = -1;

    let k = i - 1;
        // Quick ignore: if line above is empty and line above that isn't comment, assume no doc
    if (k >= 0) {
        // If the line just above looks like part of a block comment (ends with */ or starts with * or starts with /**),
        // then attempt to scan upwards to find the /** start.
        const looksLikeCommentLine = (ln: string) => {
            const t = ln.trim();
            return t.startsWith("/**") || t.startsWith("*") || t.endsWith("*/");
        };

        if (looksLikeCommentLine(lines[k])) {
            // scan upwards to find the opening '/**'
            let s = k;
            while (s >= 0 && !lines[s].includes("/**")) {
                // if encounter a line that's definitively not part of the comment, abort
                const t = lines[s].trim();
                if (!(t.startsWith("*") || t.endsWith("*/") || t === "")) {
                    // not a comment line -> abort docstring detection
                    s = -1;
                    break;
                }
                s--;
            }

            if (s >= 0 && lines[s].includes("/**")) {
                docStart = s;
                // scan forward from docStart to find the '*/'
                let d = docStart;
                while (d < i && !lines[d].includes("*/")) {
                    d++;
                }
                if (d < i && lines[d].includes("*/")) {
                    docEnd = d;
                } else {
                    // unterminated comment before function: treat as no docstring
                    docStart = -1;
                    docEnd = -1;
                }
            }
        }
    }

    // =====================================
    // Gom phần header params nhiều dòng
    // Dừng khi gặp dòng có dấu { (mở thân hàm)
    // =====================================
    let j = i;
    let foundBrace = false;

    while (j < lines.length && !lines[j].includes("{")) {
      j++;
    }
    // dòng chứa { được tính như bắt đầu logic
    if (j < lines.length && lines[j].includes("{")) {
      foundBrace = true;
    }

    // =====================================
    // Nếu không tìm thấy { → không phải function đầy đủ
    // =====================================
    if (!foundBrace) {
      i++;
      continue;
    }

    // Bắt đầu đếm {}
    let braceCount =
      (lines[j].match(/{/g) || []).length -
      (lines[j].match(/}/g) || []).length;

    let k2 = j + 1;
    while (k2 < lines.length && braceCount > 0) {
      const ln = lines[k2];
      braceCount += (ln.match(/{/g) || []).length;
      braceCount -= (ln.match(/}/g) || []).length;
      k2++;
    }

    const fnEnd = k2 - 1;
    const code = lines.slice(fnStart, fnEnd + 1).join("\n");
    const codeWithoutDoc = code.split('\n').filter(line => line.trim() !== '').join('\n').trim();

    functions.push({
      name,
      code,
      content: codeWithoutDoc,
      start: fnStart,
      end: fnEnd,
      indent,
      docStart,
      docEnd,
      blockStart: docStart,
      blockEnd: fnEnd,
    });

    i = fnEnd + 1;
  }

  return functions;
}

export function extractListFunctions(content: string): FunctionInfo[] {
  const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (editor?.document.languageId === 'typescript') {
		  return extractTSFunctions(content);
    } else if (editor?.document.languageId === 'python') {
      return extractPyFunctions(content);
    }
  }
  return []
}

let jumpLines: number[] = [];
let currentIndex = 0;

export async function searchInFunctions() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor!');
        return;
    }

    const doc = editor.document;
    const selection = editor.selection;
    let searchText = doc.getText(selection).trim();

    if (!searchText) {
        // lấy từ clipboard nếu không có text được bôi
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            if (clipboardText && clipboardText.trim().length > 0) {
                searchText = clipboardText.trim();
            } else {
                vscode.window.showWarningMessage('Please select some text or copy text to clipboard.');
                return;
            }
        } catch (err) {
            if (err instanceof Error) {
                vscode.window.showErrorMessage(`Error reading clipboard: ${err.message}`);
            } else {
                vscode.window.showErrorMessage('Error reading clipboard');
            }
            return;
        }
    }

    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        doc.uri
    );
    if (!symbols) {
        vscode.window.showErrorMessage('Cannot retrieve symbols for search.');
        return;
    }

    interface FuncInfo {
        name: string;
        range: vscode.Range;
    }

    function getFunctionsWithRange(symbols: vscode.DocumentSymbol[]): FuncInfo[] {
        let funcs: FuncInfo[] = [];
        for (const s of symbols) {
            if (s.kind === vscode.SymbolKind.Method || s.kind === vscode.SymbolKind.Function) {
                funcs.push({ name: s.name, range: s.range });
            }
            funcs.push(...getFunctionsWithRange(s.children));
        }
        return funcs;
    }

    const funcs = getFunctionsWithRange(symbols);
    const textLines = doc.getText().split(/\r?\n/);

    const output = vscode.window.createOutputChannel('Search in Functions');
    output.clear();
    output.appendLine(`Search "${searchText}" in ${doc.fileName}:`);

    // Map function name -> array of {line number, text}
    const funcMatches: Record<string, { lineNum: number; text: string }[]> = {};

    jumpLines = []; // reset lưu jumpLines
    currentIndex = 0;

    for (let lineNum = 0; lineNum < textLines.length; lineNum++) {
        const line = textLines[lineNum];
        if (line.includes(searchText)) {
            const pos = new vscode.Position(lineNum, 0);
            const containingFunc = funcs.find(f => f.range.contains(pos));
            const funcName = containingFunc ? containingFunc.name : '<global>';

            if (!funcMatches[funcName]) {
                funcMatches[funcName] = [];
            }
            funcMatches[funcName].push({ lineNum: lineNum + 1, text: line.trim() });

            jumpLines.push(lineNum + 1); // lưu vào bộ nhớ cho nhảy vòng
        }
    }

    for (const [funcName, lines] of Object.entries(funcMatches)) {
      output.appendLine(`\n__________<${funcName}>__________`);
      for (const l of lines) {
        output.appendLine(`${l.lineNum} - ${l.text}`);
      }
    }

    output.show(true);

    vscode.window.showInformationMessage(`Found ${jumpLines.length} matching lines.`);
}

export async function jumpNextLine() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || jumpLines.length === 0) { return; } 

    const lineNum = jumpLines[currentIndex] - 1; // VSCode index từ 0
    const range = new vscode.Range(lineNum, 0, lineNum, 0);
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

    currentIndex = (currentIndex + 1) % jumpLines.length; // vòng lại đầu khi hết
}

export function findFunctionBlockByName(targetName: string): FunctionInfo | undefined {
  const editor = vscode.window.activeTextEditor;
  const allText = editor?.document.getText() || '';
  const listFuncs = extractListFunctions(allText);
  const func = listFuncs.find(item => item.name === targetName);
  return func;
}

export async function showFunctionInfo() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor!');
    return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);

  // const textToProcess = selectedText && selectedText.trim() !== ""
  //   ? selectedText : editor.document.getText();

  const output = vscode.window.createOutputChannel("ListFunctions");
  output.clear();
  output.show(true);

  if (selectedText && selectedText.trim() !== '') {
    const func = findFunctionBlockByName(selectedText)
		output.appendLine(`blockStart: ${func?.blockStart}`);
    output.appendLine(`blockEnd: ${func?.blockEnd}`);
    output.appendLine(`content: ${func?.content}`);
  } else {
    const allText = editor.document.getText();
    const listFuncs = extractListFunctions(allText);
    let index = 1;
    for (const func of listFuncs) {
      output.appendLine(`${index}. ${func.name}`);
      index++;
    }
  }
}
