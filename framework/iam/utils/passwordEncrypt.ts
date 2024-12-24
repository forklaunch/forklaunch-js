import crypto from 'crypto';
import fs from 'fs';

/**
 * Encrypts a string using a public key.
 * @param {string} publicKeyPath - The path to the public key file.
 * @param {string} data - The string to encrypt.
 * @returns {string} - The encrypted string.
 */
export function passwordEncrypt(
  password: string,
  passwordEncryptionPublicKeyPath: string
): string {
  if (!passwordEncryptionPublicKeyPath) {
    throw new Error('Public key path not set');
  }

  const publicKey = fs.readFileSync(
    // TODO: Make this configurable
    passwordEncryptionPublicKeyPath,
    'utf8'
  );

  // Encrypt the data with the public key
  const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(password));
  return encrypted.toString('base64');
}
