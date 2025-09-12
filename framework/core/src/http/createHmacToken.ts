import { createHmac } from 'crypto';

/**
 * Creates an HMAC token for a given method, path, body, timestamp, nonce, and secret key.
 * @param method - The HTTP method to use.
 * @param path - The path to use.
 * @param body - The body to use.
 * @param timestamp - The timestamp to use.
 * @param nonce - The nonce to use.
 * @param secretKey - The secret key to use.
 * @returns The HMAC token.
 */
export function createHmacToken({
  method,
  path,
  body,
  timestamp,
  nonce,
  secretKey
}: {
  method: string;
  path: string;
  body: string;
  timestamp: string;
  nonce: string;
  secretKey: string;
}) {
  const hmac = createHmac('sha256', secretKey);
  hmac.update(`${method}\n${path}\n${body}\n${timestamp}\n${nonce}`);
  return hmac.digest('base64');
}
