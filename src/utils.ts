import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// import * as os from 'os';
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSecret } from './secretManager';
const config = vscode.workspace.getConfiguration("callOpenAI");
const MAX_TOKENS = 16384

export async function fetchWithTimer<T>(prompt: string, fn: (output: string) => Promise<T>, 
        max_tokens? : number, model?: string) {
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    status.show();

    let seconds = 0;
    status.text = `$(sync~spin) Loading… 0s`;

    const interval = setInterval(() => {
        seconds++;
        status.text = `$(sync~spin) Loading… ${seconds}s`;
    }, 1000);

    try {
        const selectedModel = model || config.get<string>('model') || ''
        const response = await getResponse(selectedModel, prompt, max_tokens)
        logToFile(selectedModel, prompt, response);
        await fn(response);
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
                model,
                messages: [
                    { role: "system", content: "You are a coding assistant" },
                    { role: "user", content: prompt }
                ],
                // reasoning_format: "none",
                temperature: 0.2,
                // chat_template_kwargs: {"enable_thinking": false},
                max_tokens: max_tokens ?? 255,
            }),
        });
        const data = (await res.json()) as any
        return data.choices?.[0]?.message?.content ?? '{}'
    } else if (model.startsWith('models/gemini-')) {
        const apiKey = await getSecret();
        const genAI = new GoogleGenerativeAI(apiKey || '');
        const modelInstance = genAI.getGenerativeModel({ 
            model: model || "gemini-1.5-flash",
            generationConfig: {
                maxOutputTokens: max_tokens || MAX_TOKENS,
            }
        });

        const result = await modelInstance.generateContent(prompt);
        return result.response.text() || '{}';
    } else if (model.startsWith('claude-')) {
        const apiKey = await getSecret('claude.apiKey');
        const client = new Anthropic({ apiKey });
        const isLegacyTempSupported = !/^claude-opus-4-[7-9]/.test(model);

        const message = await client.messages.create({
            model, // ví dụ: "claude-sonnet-5", "claude-opus-4-8", "claude-haiku-4-5-20251001"
            max_tokens: max_tokens || MAX_TOKENS,
            system: "You are a coding assistant",
            messages: [
                { role: "user", content: prompt }
            ],
            ...(isLegacyTempSupported ? { temperature: 0.2 } : {}),
        });

        const textBlock = message.content.find(block => block.type === "text");
        return textBlock?.text ?? '{}';
    } else {
        const apiKey = await getSecret();
        const client = new OpenAI({ apiKey });
        const max_output_tokens = max_tokens || MAX_TOKENS

        const response = await client.responses.create({
            model,
            input: prompt,
            max_output_tokens,
        });
        return response.output_text ?? '{}'
    }
}

export function extractJson(input: string): string {
    const customTagMatch = input.match(/JSON_START([\s\S]*?)JSON_END/) || '';
    if (customTagMatch) {
        return customTagMatch[1].trim();
    }

    const markdownMatch = input.match(/```json\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
        return markdownMatch[1].trim();
    }

    const markdownBlockRegex = /```(?:[a-zA-Z0-9_+-]+)?\n([\s\S]*?)\n```/;
    const match = input.match(markdownBlockRegex);

    return JSON.stringify({
        fixed_code: match && match[1] ? match[1].trim() : input.trim(),
        explanation: '',
    });
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
