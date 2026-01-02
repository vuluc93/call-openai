import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// import * as os from 'os';
import OpenAI from "openai";
import { getSecret } from './secretManager';
const config = vscode.workspace.getConfiguration("callOpenAI");

export async function fetchWithTimer<T>(prompt: string, fn: (output: string) => Promise<T>, max_tokens? : number) {
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    status.show();

    let seconds = 0;
    status.text = `$(sync~spin) Loading… 0s`;

    const interval = setInterval(() => {
        seconds++;
        status.text = `$(sync~spin) Loading… ${seconds}s`;
    }, 1000);

    
    try {
        const mode = config.get<"offline" | "online">("mode") || 'online';

        // const apiKey = await getSecret();
        // const client = new OpenAI({ apiKey });
        const max_output_tokens = max_tokens || 1024

        // const response = await client.responses.create({
        //     model: max_output_tokens > 1024 ? 'gpt-4.1' : 'gpt-5.2',
        //     input: prompt,
        //     max_output_tokens,
        // });
        const model = mode == 'offline' ? 'local-llama' :  max_output_tokens > 1024 ? 'gpt-4.1' : 'gpt-5.2'
        const response = await getResponse(model, prompt, max_tokens)
        logToFile(model, prompt, response);
        await fn(response);
        // return result;
    } catch (err: any) {
        console.error('OpenAI call failed:', err);
        vscode.window.showErrorMessage(`OpenAI error: ${err.message ?? String(err)}`);
    } finally {
        clearInterval(interval);
        status.dispose();
    }
}

async function getResponse(model: string, prompt: string, max_tokens? : number) {
    if (model === 'local-llama') {
        const url = config.get<string>("offlineUrl") || ''
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "local-llama",
                messages: [
                    // { role: "system", content: "You are a coding assistant" },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
            }),
        });
        const data = (await res.json()) as any
        return data.choices?.[0]?.message?.content ?? '{}'
    } else {
        const apiKey = await getSecret();
        const client = new OpenAI({ apiKey });
        const max_output_tokens = max_tokens || 1024

        const response = await client.responses.create({
            model: max_output_tokens > 1024 ? 'gpt-4.1' : 'gpt-5.2',
            input: prompt,
            max_output_tokens,
        });
        return response.output_text ?? '{}'
    }
}

/**
 * Logs the input and response to a file.
 * The log file is named based on the current date. If the directory does not exist, it is created recursively.
 * Each log entry includes a timestamped header, a summary of the input (first line), the response, and a separator.
 *
 * @param input - The input string to log (usually the user's input or request).
 * @param response - The response string to log (usually the application's output or response).
 */
function logToFile(model: string, input: string, response: string) {
    // const logDir = path.join('D:\backup\call-openai', 'logs');
    const logDir = String.raw`D:\backup\call-openai\logs`;
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, `log-${new Date().toISOString().slice(0,10)}.txt`);
    // const firstLineInput = input.split('\n').find(line => line.trim().length > 0);
    const logEntry = [
        `${'-'.repeat(60)}<${new Date().toISOString()}>${'-'.repeat(60)}`,
        `[${input.substring(0, 150)}]`,
        `-----<${model}>----`,
        `${response}`,
        '\n'
    ].join('\n');
    fs.appendFileSync(logPath, logEntry, 'utf8');
}
