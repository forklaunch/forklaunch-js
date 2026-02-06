import { describe, expect, it } from 'vitest';
import { hasFeatureChecks } from '../src/http/guards/hasFeatureChecks';

describe('hasFeatureChecks', () => {
  describe('should return true', () => {
    it('when object has non-empty requiredFeatures array', () => {
      const auth = {
        requiredFeatures: ['feature1', 'feature2']
      };
      expect(hasFeatureChecks(auth)).toBe(true);
    });

    it('when object has single feature in requiredFeatures', () => {
      const auth = {
        requiredFeatures: ['advanced_observability']
      };
      expect(hasFeatureChecks(auth)).toBe(true);
    });

    it('when object has requiredFeatures and other properties', () => {
      const auth = {
        requiredFeatures: ['feature1'],
        allowedRoles: new Set(['admin'])
      };
      expect(hasFeatureChecks(auth)).toBe(true);
    });
  });

  describe('should return false', () => {
    it('when requiredFeatures is an empty array', () => {
      const auth = {
        requiredFeatures: []
      };
      expect(hasFeatureChecks(auth)).toBe(false);
    });

    it('when requiredFeatures is not an array', () => {
      const auth = {
        requiredFeatures: 'feature1'
      };
      expect(hasFeatureChecks(auth)).toBe(false);
    });

    it('when requiredFeatures is missing', () => {
      const auth = {
        requireActiveSubscription: true
      };
      expect(hasFeatureChecks(auth)).toBe(false);
    });

    it('when input is null', () => {
      expect(hasFeatureChecks(null)).toBe(false);
    });

    it('when input is undefined', () => {
      expect(hasFeatureChecks(undefined)).toBe(false);
    });

    it('when input is a string', () => {
      expect(hasFeatureChecks('feature')).toBe(false);
    });

    it('when input is an empty object', () => {
      expect(hasFeatureChecks({})).toBe(false);
    });
  });
});
