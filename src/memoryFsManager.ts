import * as vscode from 'vscode';

class MemoryFS implements vscode.FileSystemProvider {
  private readonly files = new Map<string, Uint8Array>();
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  private readonly stats = new Map<string, vscode.FileStat>();

  readonly onDidChangeFile = this.emitter.event;

  readFile(uri: vscode.Uri): Uint8Array {
    const key = uri.toString();
    const data = this.files.get(key);
    if (!data) {
      throw vscode.FileSystemError.FileNotFound();
    }
    return data;
  }

  writeFile(uri: vscode.Uri, content: Uint8Array) {
    const key = uri.toString();

    this.files.set(key, content);

    this.stats.set(key, {
      type: vscode.FileType.File,
      ctime: Date.now(),
      mtime: Date.now(),
      size: content.byteLength,
    });

  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const key = uri.toString();
    const stat = this.stats.get(key);
    if (!stat) {
      throw vscode.FileSystemError.FileNotFound();
    }
    return stat;
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

/**
 * Initializes the in-memory file system (MemoryFS) for the VS Code extension.
 * Registers the 'tempinput' file system provider and ensures documents are saved when changed.
 *
 * @param context The VS Code extension context
 */
export function initMemoryFS(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('tempinput', memFs, { isReadonly: false }),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.scheme === 'tempinput' && !e.document.isClosed) {
        e.document.save();
      }
    })
  );
}

/**
 * Opens a temporary text editor with the provided initial text.
 *
 * @param {string} initialText - The initial text to populate in the editor (optional).
 * @returns {Promise<vscode.TextEditor>} The opened text editor instance.
 */
export async function openTempEditor(initialText = '') {
  const uri = vscode.Uri.parse("tempinput:/extended-input");
  memFs.writeFile(uri, Buffer.from(initialText));

  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, { preview: false });

  const lastLine = doc.lineCount - 1;
  const pos = new vscode.Position(lastLine, 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos));

  return editor;
}
