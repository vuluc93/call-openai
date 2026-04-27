import * as vscode from 'vscode';
import { goToLine } from './features/scrollTracking';

class PreviewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    public visibleLines?: number;

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };

        webviewView.webview.onDidReceiveMessage(data => {
            if (data.command === 'jumpTo') {
                goToLine(data.line);
            } else if (data.command === 'copyText') {
                vscode.env.clipboard.writeText(data.text);
                vscode.window.showInformationMessage('Copied to clipboard!');
            } else if (data.command === 'onResize') {
                this.visibleLines = Math.max(3, data.visibleLines - 2);
                vscode.window.showInformationMessage('visibleLines: ' + this.visibleLines);
            }
        });

        this._view.webview.html = this._getHtmlForWebview();
    }

    public update(
        line: number,
        func: string,
        content: { 
            number: number; text: string; isTarget: boolean; linkNumber?: number;
        }[]) {
        if (this._view) {
            this._view.show?.(true)
            this._view.webview.postMessage({ line, func, content });
        }
    }

    private _getHtmlForWebview() {
        const script = /* html */ `
            <script>
                const vscode = acquireVsCodeApi();

                function jumpToLine(lineNum) {
                    vscode.postMessage({
                        command: 'jumpTo',
                        line: lineNum
                    });
                }

                function copyLine(text) {
                    vscode.postMessage({
                        command: 'copyText',
                        text: text
                    });
                }

                window.addEventListener('message', event => {
                    const { line, func, content } = event.data;
                    var safeText = func.replace(/'/g, "\\'");
                    var html = '<span class="ln" onclick="copyLine(' + "'" + safeText + "'" + ')">' + line + '</span>' +
                                '<span onclick="jumpToLine(' + (line - 1) + ')" style="cursor:pointer; margin-left: 10px;">' +
                                func.trim() + '</span>';
                    document.getElementById('header').innerHTML = html;

                    const container = document.getElementById('content-container');
                    var html = '';
                    for (var i = 0; i < content.length; i++) {
                        var l = content[i];
                        var className = l.isTarget ? 'line-item hl' : 'line-item';
                        var safeText = l.text.replace(/'/g, "\\'");
                        html += '<div class="' + className + '">' +
                                '<span class="ln" onclick="copyLine(' + "'" + safeText + "'" + ')">' + l.number + '</span>' +
                                '<span class="' + className + '" onclick="jumpToLine(' + l.linkNumber + ')" style="cursor:pointer">' +
                                safeText + '</span>' +
                            '</div>';
                    }
                    container.innerHTML = html;
                });

                function escapeHtml(text) {
                    if (!text) return "";
                    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                }

                const resizeObserver = new ResizeObserver(entries => {
                    const height = window.innerHeight;
                    const estimatedLines = Math.floor(height / 33);
                    
                    vscode.postMessage({
                        command: 'onResize',
                        visibleLines: estimatedLines
                    });
                });

                resizeObserver.observe(document.body);
            </script>`;

        return `
            <html>
            <style>
                body { font-family: var(--vscode-editor-font-family); padding: 10px; }
                .line { color: var(--vscode-symbolIcon-propertyForeground); }
                .line-item { display: flex; white-space: pre; }
                .ln { background: transparent; color: var(--vscode-editorLineNumber-foreground); min-width: 40px; text-align: center; }
                .ln:hover { background: #fff9c4; }
                .hl { background: var(--vscode-editor-lineHighlightBackground); color: var(--vscode-editor-foreground); font-weight: bold; }
            </style>
            <body>
                <div id="header" class="line">--</div>
                <pre id="content-container" class="content">Waiting for scroll...</pre>
                ${script}
            </body>
            </html>`;
    }
}

export const sideProvider = new PreviewProvider();
export const bottomProvider = new PreviewProvider();
