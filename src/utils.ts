import * as vscode from 'vscode';

export async function fetchWithTimer<T>(fn: () => Promise<T>) {
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    status.show();

    let seconds = 0;
    status.text = `$(sync~spin) Loading… 0s`;

    const interval = setInterval(() => {
        seconds++;
        status.text = `$(sync~spin) Loading… ${seconds}s`;
    }, 1000);

    try {
        const result = await fn();
        return result;
    } finally {
        clearInterval(interval);
        status.dispose();
    }
}
