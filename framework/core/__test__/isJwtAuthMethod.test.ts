import { describe, expect, it } from 'vitest';
import { isJwtAuthMethod } from '../src/http/guards/isJwtAuthMethod';

describe('isJwtAuthMethod', () => {
  describe('should return true', () => {
    it('when object has jwt with signatureKey', () => {
      const auth = {
        jwt: {
          signatureKey: 'secret-key'
        }
      };
      expect(isJwtAuthMethod(auth)).toBe(true);
    });

    it('when object has jwt with jwksPublicKeyUrl', () => {
      const auth = {
        jwt: {
          jwksPublicKeyUrl: 'https://example.com/.well-known/jwks.json'
        }
      };
      expect(isJwtAuthMethod(auth)).toBe(true);
    });

    it('when object has jwt with jwksPublicKey', () => {
      const auth = {
        jwt: {
          jwksPublicKey: {
            kty: 'RSA',
            n: 'test',
            e: 'AQAB'
          }
        }
      };
      expect(isJwtAuthMethod(auth)).toBe(true);
    });
  });

  describe('should return false', () => {
    it('when jwt property is null', () => {
      const auth = {
        jwt: null
      };
      expect(isJwtAuthMethod(auth)).toBe(false);
    });

    it('when jwt property is undefined', () => {
      const auth = {
        jwt: undefined
      };
      expect(isJwtAuthMethod(auth)).toBe(false);
    });

    it('when jwt property is missing', () => {
      const auth = {
        basic: {
          login: () => true
        }
      };
      expect(isJwtAuthMethod(auth)).toBe(false);
    });

    it('when input is null', () => {
      expect(isJwtAuthMethod(null)).toBe(false);
    });

    it('when input is undefined', () => {
      expect(isJwtAuthMethod(undefined)).toBe(false);
    });

    it('when input is a string', () => {
      expect(isJwtAuthMethod('jwt')).toBe(false);
    });
  });
});
