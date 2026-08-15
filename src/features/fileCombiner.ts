import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'fs';

export async function fileCombiner() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Bạn cần mở một thư mục (workspace) trước.');
        return;
    }
    const outputDir = 'D:\\backup\\' + vscode.workspace.workspaceFolders?.[0].uri.fsPath.split('\\').pop();

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const documents = vscode.workspace.textDocuments;
    let combinedContent = '';
    let fileCount = 0;

    for (const doc of documents) {
        // Chỉ xử lý các file hệ thống (bỏ qua các file ảo như output console, git diff...)
        if (doc.uri.scheme === 'file') {
            // Tìm workspace gốc chứa file này để lấy đường dẫn tương đối
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
            if (workspaceFolder) {
                // path.relative sẽ tự động trả về dấu \ trên Windows và / trên macOS/Linux
                const relativePath = path.relative(workspaceFolder.uri.fsPath, doc.fileName);
                
                // Gộp nội dung theo format bạn yêu cầu
                combinedContent += `// file ${relativePath}\n\n`;
                combinedContent += doc.getText();
                combinedContent += `\n\n`; // Dòng trống ngăn cách giữa các file
                fileCount++;
            }
        }
    }

    if (fileCount === 0) {
        vscode.window.showWarningMessage('Không tìm thấy file code nào đang mở trong workspace.');
        return;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateTimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    const outputFileName = `${dateTimeStr}.txt`;
    const outputFilePath = path.join(outputDir, outputFileName);

    try {
        fs.writeFileSync(outputFilePath, combinedContent, 'utf8');
        vscode.window.showInformationMessage(`Đã gộp thành công ${fileCount} file!`);
        
        const outputUri = vscode.Uri.file(outputFilePath);
        const outputDoc = await vscode.workspace.openTextDocument(outputUri);
        await vscode.window.showTextDocument(outputDoc);
    } catch (err: any) {
        vscode.window.showErrorMessage(`Lỗi khi lưu file: ${err.message}`);
    }
}
