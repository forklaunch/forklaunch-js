import { describe, expect, it } from 'vitest';
import { isHmacMethod } from '../src/http/guards/isHmacMethod';

describe('isHmacMethod', () => {
  describe('should return true', () => {
    it('when object has hmac with secretKeys', () => {
      const auth = {
        hmac: {
          secretKeys: {
            key1: 'secret1',
            key2: 'secret2'
          }
        }
      };
      expect(isHmacMethod(auth)).toBe(true);
    });

    it('when object has hmac with empty secretKeys', () => {
      const auth = {
        hmac: {
          secretKeys: {}
        }
      };
      expect(isHmacMethod(auth)).toBe(true);
    });
  });

  describe('should return false', () => {
    it('when hmac property is null', () => {
      const auth = {
        hmac: null
      };
      expect(isHmacMethod(auth)).toBe(false);
    });

    it('when hmac property is undefined', () => {
      const auth = {
        hmac: undefined
      };
      expect(isHmacMethod(auth)).toBe(false);
    });

    it('when hmac property is missing', () => {
      const auth = {
        jwt: {
          signatureKey: 'secret'
        }
      };
      expect(isHmacMethod(auth)).toBe(false);
    });

    it('when input is null', () => {
      expect(isHmacMethod(null)).toBe(false);
    });

    it('when input is undefined', () => {
      expect(isHmacMethod(undefined)).toBe(false);
    });

    it('when input is a string', () => {
      expect(isHmacMethod('hmac')).toBe(false);
    });
  });
});
