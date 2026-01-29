import { randomUUID } from 'crypto';
import { createHmacToken } from './createHmacToken';

/**
 * Generate HMAC authorization headers for service-to-service authentication.
 *
 * @param secretKey - The shared HMAC secret key
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - The API path
 * @param body - Optional request body
 * @param keyId - Optional key identifier (defaults to 'default')
 * @returns Authorization header object
 *
 * @example
 * ```typescript
 * const headers = generateHmacAuthHeaders({
 *   secretKey: 'my-secret-key',
 *   method: 'POST',
 *   path: '/api/users',
 *   body: { name: 'John' }
 * });
 * // headers.authorization = 'HMAC keyId=default ts=2024-01-16T12:00:00.000Z nonce=... signature=...'
 * ```
 */
export function generateHmacAuthHeaders({
  secretKey,
  method,
  path,
  body,
  keyId = 'default'
}: {
  secretKey: string;
  method: string;
  path: string;
  body?: unknown;
  keyId?: string;
}): {
  authorization: `HMAC keyId=${string} ts=${string} nonce=${string} signature=${string}`;
} {
  const timestamp = new Date();
  const nonce = randomUUID();

  const signature = createHmacToken({
    secretKey,
    method,
    path,
    timestamp,
    nonce,
    body
  });

  return {
    authorization: `HMAC keyId=${keyId} ts=${timestamp.toISOString()} nonce=${nonce} signature=${signature}`
  };
}
