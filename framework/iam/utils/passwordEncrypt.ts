import crypto from 'crypto';
import fs from 'fs';

/**
 * Encrypts a string using a public key.
 * @param {string} publicKeyPath - The path to the public key file.
 * @param {string} data - The string to encrypt.
 * @returns {string} - The encrypted string.
 */
export default function passwordEncrypt(password: string): string {
  if (!process.env.PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH) {
    throw new Error('Public key path not set');
  }

  const publicKey = fs.readFileSync(
    // TODO: Make this configurable
    process.env.PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH,
    'utf8'
  );

  // Encrypt the data with the public key
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(password));
  return encrypted.toString('base64');
}
