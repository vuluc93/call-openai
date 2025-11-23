import type { SecretStorage } from 'vscode';
const SECRET_KEY_NAME = 'openai.apiKey';

let secrets: SecretStorage | undefined;

/**
 * Initializes the secrets storage with the provided SecretStorage instance.
 * 
 * @param secretStorage - An instance of SecretStorage to be used for storing secrets.
 * @return void - This function does not return any value.
 */
export function initSecrets(secretStorage: SecretStorage): void {
  secrets = secretStorage;
}

/**
 * Asynchronously retrieves a secret value from the secret storage using the predefined key name.
 * 
 * @throws Error if the secret storage has not been initialized.
 * @return Promise<string | undefined> - A promise that resolves to the secret string if found, or undefined if the secret does not exist.
 */
export async function getSecret(): Promise<string | undefined> {
  if (!secrets) {
    throw new Error('SecretStorage chưa được khởi tạo');
  }
  return await secrets.get(SECRET_KEY_NAME);
}
