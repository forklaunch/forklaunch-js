import { safeStringify } from '@forklaunch/common';
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
  body?: unknown;
  timestamp: Date;
  nonce: string;
  secretKey: string;
}) {
  const hmac = createHmac('sha256', secretKey);
  const bodyString = body ? `${safeStringify(body)}\n` : undefined;
  hmac.update(
    `${method}\n${path}\n${bodyString}${timestamp.toISOString()}\n${nonce}`
  );
  return hmac.digest('base64');
}
