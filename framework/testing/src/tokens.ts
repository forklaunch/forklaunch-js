/**
 * Standard mock authentication tokens for testing
 */
export const TEST_TOKENS = {
  /**
   * Mock Bearer token for testing
   */
  AUTH: 'Bearer test-token',

  /**
   * Mock valid HMAC token for testing
   */
  HMAC: 'HMAC keyId=test-key ts=1234567890 nonce=test-nonce signature=test-signature',

  /**
   * Mock invalid HMAC token for testing authentication failures
   */
  HMAC_INVALID:
    'HMAC keyId=invalid-key ts=1234567890 nonce=invalid-nonce signature=invalid-signature'
} as const;
