import { describe, expect, it } from 'vitest';
import { hasSubscriptionChecks } from '../src/http/guards/hasSubscriptionChecks';

describe('hasSubscriptionChecks', () => {
  describe('should return true', () => {
    it('when object has requireActiveSubscription set to true', () => {
      const auth = {
        requireActiveSubscription: true
      };
      expect(hasSubscriptionChecks(auth)).toBe(true);
    });

    it('when object has requireActiveSubscription and other properties', () => {
      const auth = {
        requireActiveSubscription: true,
        allowedRoles: new Set(['admin'])
      };
      expect(hasSubscriptionChecks(auth)).toBe(true);
    });
  });

  describe('should return false', () => {
    it('when requireActiveSubscription is false', () => {
      const auth = {
        requireActiveSubscription: false
      };
      expect(hasSubscriptionChecks(auth)).toBe(false);
    });

    it('when requireActiveSubscription is missing', () => {
      const auth = {
        requiredFeatures: ['feature1']
      };
      expect(hasSubscriptionChecks(auth)).toBe(false);
    });

    it('when input is null', () => {
      expect(hasSubscriptionChecks(null)).toBe(false);
    });

    it('when input is undefined', () => {
      expect(hasSubscriptionChecks(undefined)).toBe(false);
    });

    it('when input is a string', () => {
      expect(hasSubscriptionChecks('subscription')).toBe(false);
    });

    it('when input is an empty object', () => {
      expect(hasSubscriptionChecks({})).toBe(false);
    });
  });
});
