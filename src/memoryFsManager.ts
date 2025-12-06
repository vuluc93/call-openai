import * as vscode from 'vscode';

class MemoryFS implements vscode.FileSystemProvider {
  private files = new Map<string, Uint8Array>();
  private emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

  readonly onDidChangeFile = this.emitter.event;

  readFile(uri: vscode.Uri): Uint8Array {
      return this.files.get(uri.toString()) ?? new Uint8Array();
  }

  writeFile(uri: vscode.Uri, content: Uint8Array): void {
      this.files.set(uri.toString(), content);
      this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  stat(_uri: vscode.Uri): vscode.FileStat {
      return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
  }

  readDirectory(): [string, vscode.FileType][] {
      return [];
  }

  watch(): vscode.Disposable {
      return { dispose() {} };
  }

  createDirectory() {}
  delete() {}
  rename() {}
}

const memFs = new MemoryFS();

export function initMemoryFS(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("tempinput", memFs, { isReadonly: false }),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.scheme === "tempinput" && !e.document.isClosed) {
        e.document.save();
      }
    })
  );
}

export async function openTempEditor(initialText = '') {
  const uri = vscode.Uri.parse("tempinput:/extended-input");
  memFs.writeFile(uri, Buffer.from(initialText));

  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, { preview: false });
  return editor;
}
