import * as vscode from 'vscode';
import OpenAI from "openai";
import { initSecrets } from './secretManager';
import { replaceByRules } from './features/replaceByRules';
import { fixWithOpenAI } from './features/fixWithOpenAI';
import { shortAnswer } from './features/shortAnswer';
import { extractTSFunctions } from './features/listFunctions';

const SECRET_KEY_NAME = 'openai.apiKey';

export async function activate(context: vscode.ExtensionContext) {
	console.log('OpenAI example extension active');
	initSecrets(context.secrets);

  	const disposableSetKey = vscode.commands.registerCommand('extension.setOpenAIKey', async () => {
    const key = await vscode.window.showInputBox({
			placeHolder: 'Paste your OpenAI API key (sk-...)',
			ignoreFocusOut: true,
			password: true
		});
		if (!key) {
			vscode.window.showWarningMessage('No key provided.');
			return;
		}
		await context.secrets.store(SECRET_KEY_NAME, key);
		vscode.window.showInformationMessage('OpenAI API key saved to VSCode Secret Storage.');
	});

	

	context.subscriptions.push(disposableSetKey);
	register(context, "extension.replaceByRules", replaceByRules);
 	register(context, "extension.fixWithOpenAI", fixWithOpenAI);
  	register(context, "extension.shortAnswer", shortAnswer);
   	register(context, "extension.listFunction", showListFunction);
}

export function deactivate() {}


/**
 * Registers a new VSCode command and adds it to the extension context's subscriptions.
 *
 * @param ctx - The extension context provided on activation.
 * @param cmd - The command identifier (string).
 * @param fn - The callback function to execute when the command is invoked.
 */
function register(ctx: vscode.ExtensionContext,
    cmd: string,
    fn: (...args: unknown[]) => unknown) {
    ctx.subscriptions.push(vscode.commands.registerCommand(cmd, fn));
}

export async function showListFunction() {
  	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('No active editor!');
		return;
	}

	let textToProcess = "";
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (selectedText && selectedText.trim() !== "") {
        textToProcess = selectedText;
    } else {
        textToProcess = editor.document.getText();
    }
	const listFuncs = extractTSFunctions(textToProcess);

	const output = vscode.window.createOutputChannel("ListFunctions");
	output.clear();
	output.appendLine(`${textToProcess}`);
	output.show(true);
	for (const func of listFuncs) {
		output.appendLine(`${func.name}`);
	}
}
