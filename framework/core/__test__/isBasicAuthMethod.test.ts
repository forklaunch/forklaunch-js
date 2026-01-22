import { describe, expect, it } from 'vitest';
import { isBasicAuthMethod } from '../src/http/guards/isBasicAuthMethod';

describe('isBasicAuthMethod', () => {
  describe('should return true', () => {
    it('when object has basic with login function', () => {
      const auth = {
        basic: {
          login: (username: string, password: string) => {
            return username === 'admin' && password === 'password';
          }
        }
      };
      expect(isBasicAuthMethod(auth)).toBe(true);
    });
  });

  describe('should return false', () => {
    it('when basic property is null', () => {
      const auth = {
        basic: null
      };
      expect(isBasicAuthMethod(auth)).toBe(false);
    });

    it('when basic property is undefined', () => {
      const auth = {
        basic: undefined
      };
      expect(isBasicAuthMethod(auth)).toBe(false);
    });

    it('when basic property is missing', () => {
      const auth = {
        jwt: {
          signatureKey: 'secret'
        }
      };
      expect(isBasicAuthMethod(auth)).toBe(false);
    });

    it('when input is null', () => {
      expect(isBasicAuthMethod(null)).toBe(false);
    });

    it('when input is undefined', () => {
      expect(isBasicAuthMethod(undefined)).toBe(false);
    });

    it('when input is a string', () => {
      expect(isBasicAuthMethod('basic')).toBe(false);
    });
  });
});
