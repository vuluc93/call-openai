import * as vscode from 'vscode';
import * as fs from 'node:fs';
import os from "os";
// import * as path from 'node:path';

export async function replaceByRules() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  
  // const configPath = String.raw`C:\Users\${os.userInfo().username}\ProcessFiles\replaceRules.json`;
  const configPath = `C:\\Users\\${os.userInfo().username}\\ProcessFiles\\replaceRules.json`;
  const output = vscode.window.createOutputChannel("ReplaceByRules");
  output.clear();
  output.appendLine(`ConfigPath:  ${configPath}`);
  const raw = fs.readFileSync(configPath, 'utf-8');
  const rules = JSON.parse(raw);

  const selection = editor.selection;
  let text = editor.document.getText(selection);
  output.appendLine(`Replace:  ${text}`);

  text = applyRulesFormat(text, rules);

  editor.edit(editBuilder => {
    editBuilder.replace(selection, text);
  });
  output.appendLine(`To: ${text}`);
  output.show(true);
}

function applyRulesFormat(text: string, rules: Array<{ from: string; to: string }>) {
  for (const rule of rules) {
    const parts = rule.from.split(/{\d+}/g);
    const matches = rule.from.match(/{(\d+)}/g) || [];

    let start = 0;
    const values = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part) {
        const idx = text.indexOf(part, start);
        if (idx === -1) {break;}
        start = idx + part.length;
      }
      if (i < matches.length) {
        const nextPart = parts[i + 1] || "";
        const endIdx = nextPart ? text.indexOf(nextPart, start) : text.length;
        if (endIdx === -1) {break;}
        const value = text.slice(start, endIdx);
        values.push(value.trim());
        start = endIdx;
      }
    }

    if (values.length === matches.length) {
      let out = rule.to;
      values.forEach((v, i) => {
        out = out.replace(new RegExp(`\\{${i}\\}`, "g"), v);
      });
      return out;
    }
  }

  return text;
}
