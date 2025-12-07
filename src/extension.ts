import * as vscode from 'vscode';
import { initSecrets } from './secretManager';
import { initMemoryFS } from './memoryFsManager';
import { replaceByRules } from './features/replaceByRules';
import { inputBox, inputMutilLines } from './features/inputPrompt';
import { insertLoggerDebug } from './features/insertLoggerDebug';
import { pasteMultiTimes } from './features/pasteMultiTimes';
import { replaceLimited } from './features/replaceLimited';
import { simpleCheckReplace } from './features/simpleCheckReplace';
import { docstringAuto } from './features/docstringAuto';
import { moveFunction } from './features/moveFunction';
import {
  showFunctionInfo,
  searchInFunctions,
  jumpNextLine,
} from './features/listFunctions';

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

	initMemoryFS(context);

	register(context, "extension.replaceByRules", replaceByRules);
 	register(context, "extension.inputBox", inputBox);
  	register(context, "extension.inputMutilLines", inputMutilLines);
   	// register(context, "extension.toggleExtendedInput", toggleExtendedInput);
   	register(context, "extension.listFunction", showFunctionInfo);
    register(context, "extension.searchInFunctions", searchInFunctions);
    register(context, "extension.jumpNextLine", jumpNextLine);
	register(context, "extension.insertLoggerDebug", insertLoggerDebug);
	register(context, "extension.pasteMultiTimes", pasteMultiTimes);
	register(context, "extension.replaceLimited", replaceLimited);
	register(context, "extension.simpleCheckReplace", simpleCheckReplace);
 	register(context, "extension.docstringAuto", docstringAuto);
  	register(context, "extension.moveFunction", moveFunction);
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
