import * as vscode from 'vscode';
import OpenAI from "openai";
import { getSecret } from './secretManager';

export async function fetchWithTimer<T>(prompt: string, fn: (output: string) => Promise<T>) {
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    status.show();

    let seconds = 0;
    status.text = `$(sync~spin) Loading… 0s`;

    const interval = setInterval(() => {
        seconds++;
        status.text = `$(sync~spin) Loading… ${seconds}s`;
    }, 1000);

    try {
        const apiKey = await getSecret();
        const client = new OpenAI({ apiKey });

        const response = await client.responses.create({
            model: "gpt-4.1",
            input: prompt,
            max_output_tokens: 250,
        });


        await fn(response.output_text ?? '{}');
        // return result;
    } catch (err: any) {
        console.error('OpenAI call failed:', err);
        vscode.window.showErrorMessage(`OpenAI error: ${err.message ?? String(err)}`);
    } finally {
        clearInterval(interval);
        status.dispose();
    }
}
