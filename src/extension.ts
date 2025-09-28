import * as vscode from 'vscode';

type ReplaceGuess = { X: string; Y: string; count: number };

function normalizeText(src: string): string {
  return src
    .split(/\r?\n/)               // tách từng dòng
    .map(line => line.trim())     // bỏ khoảng trắng 2 đầu
    .filter(line => line.length > 0) // bỏ dòng trống
    .join("\n");                  // ghép lại
}

function simpleCharReplace(A: string, B: string, maxLen?: number): ReplaceGuess {
  if (A === B) return { X: "", Y: "", count: 0 };
  const n = A.length;
  const limit = typeof maxLen === "number" ? Math.min(maxLen, n) : n;
  const seen = new Set<string>();

  for (let len = 1; len <= limit; len++) {
    for (let start = 0; start + len <= n; start++) {
      const X = A.substring(start, start + len);
      if (seen.has(X)) continue;
      seen.add(X);

      const parts = A.split(X);
      if (parts.length === 1) continue; // X không xuất hiện

      const k = parts.length;
      const sumPartsLen = parts.reduce((s, p) => s + p.length, 0);
      const totalYLen = B.length - sumPartsLen;
      if (totalYLen < 0) continue;
      if (k - 1 === 0) continue;
      if (totalYLen % (k - 1) !== 0) continue; // độ dài Y phải đều cho các vị trí

      const lenY = Math.floor(totalYLen / (k - 1));
      const startY = parts[0].length;
      const Y = lenY > 0 ? B.substring(startY, startY + lenY) : "";

      // rebuild and compare
      let rebuilt = parts[0];
      for (let i = 1; i < k; i++) {
        rebuilt += Y + parts[i];
      }
      if (rebuilt === B) {
        // count occurrences (non-overlapping, tương ứng với split)
        const count = parts.length - 1;
        return { X, Y, count };
      }
    }
  }

  // Không tìm được X ngắn hơn -> replace toàn bộ
  return { X: A, Y: B, count: 1 };
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "simple-check-replace" is now active!');

	let disposable = vscode.commands.registerCommand('extension.compareWithClipboard', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const selection = editor.document.getText(editor.selection);
		const clipboard = await vscode.env.clipboard.readText();

		const result = simpleCharReplace(normalizeText(selection), normalizeText(clipboard), 1000);

		const output = vscode.window.createOutputChannel("Compare Result");
		output.clear();
		output.appendLine(`[Replace]:`);
    output.appendLine(`${result.X}`);
    output.appendLine(`[With]:`);
    output.appendLine(`${result.Y}`);
		output.appendLine(`Count = ${result.count}`);
		output.show(true);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
