import type { SecretStorage } from 'vscode';
const SECRET_KEY_NAME = 'openai.apiKey';

let secrets: SecretStorage | undefined;

export function initSecrets(secretStorage: SecretStorage) {
  secrets = secretStorage;
}

export async function getSecret(): Promise<string | undefined> {
  if (!secrets) {
    throw new Error('SecretStorage chưa được khởi tạo');
  }
  return await secrets.get(SECRET_KEY_NAME);
}
