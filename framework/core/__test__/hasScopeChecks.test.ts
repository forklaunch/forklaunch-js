import { describe, expect, it } from 'vitest';
import { hasScopeChecks } from '../src/http/guards/hasScopeChecks';

describe('hasScopeChecks', () => {
  describe('should return true', () => {
    it('when object has requiredScope with a non-null value', () => {
      const auth = {
        requiredScope: 'read:user',
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('when object has requiredScope with empty string', () => {
      const auth = {
        requiredScope: '',
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('when object has requiredScope with array value', () => {
      const auth = {
        requiredScope: ['read:user', 'write:user'],
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('when object has requiredScope and surfaceScope', () => {
      const auth = {
        requiredScope: 'read:user',
        surfaceScope: 'admin',
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('when object has requiredScope and other properties', () => {
      const auth = {
        requiredScope: 'read:user',
        userId: '123',
        token: 'abc',
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('when object has requiredScope without surfaceScope', () => {
      const auth = {
        requiredScope: 'read:user',
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });
  });

  describe('should return false', () => {
    it('when requiredScope is null', () => {
      const auth = {
        requiredScope: null,
      };
      expect(hasScopeChecks(auth)).toBe(false);
    });

    it('when requiredScope is undefined', () => {
      const auth = {
        requiredScope: undefined,
      };
      expect(hasScopeChecks(auth)).toBe(false);
    });

    it('when requiredScope property is missing', () => {
      const auth = {
        userId: '123',
      };
      expect(hasScopeChecks(auth)).toBe(false);
    });

    it('when input is null', () => {
      expect(hasScopeChecks(null)).toBe(false);
    });

    it('when input is undefined', () => {
      expect(hasScopeChecks(undefined)).toBe(false);
    });

    it('when input is a string', () => {
      expect(hasScopeChecks('read:user')).toBe(false);
    });

    it('when input is a number', () => {
      expect(hasScopeChecks(123)).toBe(false);
    });

    it('when input is a boolean', () => {
      expect(hasScopeChecks(true)).toBe(false);
    });

    it('when input is an array', () => {
      expect(hasScopeChecks(['read:user'])).toBe(false);
    });

    it('when input is an empty object', () => {
      expect(hasScopeChecks({})).toBe(false);
    });
  });

  describe('surfaceScope should be optional', () => {
    it('should return true when only requiredScope is present', () => {
      const auth = {
        requiredScope: 'read:user',
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('should return true when both requiredScope and surfaceScope are present', () => {
      const auth = {
        requiredScope: 'read:user',
        surfaceScope: 'admin',
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('should return true when surfaceScope is null but requiredScope is valid', () => {
      const auth = {
        requiredScope: 'read:user',
        surfaceScope: null,
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('should return true when surfaceScope is undefined but requiredScope is valid', () => {
      const auth = {
        requiredScope: 'read:user',
        surfaceScope: undefined,
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle objects with numeric requiredScope (0 is not null)', () => {
      const auth = {
        requiredScope: 0,
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('should handle objects with false requiredScope (false is not null)', () => {
      const auth = {
        requiredScope: false,
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('should handle objects with object requiredScope', () => {
      const auth = {
        requiredScope: { scope: 'read:user' },
      };
      expect(hasScopeChecks(auth)).toBe(true);
    });

    it('should handle prototype pollution attempts', () => {
      const auth = Object.create({ requiredScope: 'read:user' });
      // Should only check own properties or inherited properties
      expect(hasScopeChecks(auth)).toBe(true);
    });
  });
});

