import { describe, expect, it } from 'vitest';
import { hasScopeChecks } from '../src/http/guards/hasScopeChecks';

describe('hasScopeChecks', () => {
  it('should return true when both requiredScope and surfaceScopes are present', () => {
    const auth = {
      requiredScope: 'admin:write',
      surfaceScopes: async () => new Set(['admin:write'])
    };
    expect(hasScopeChecks(auth)).toBe(true);
  });

  it('should return false when requiredScope is missing', () => {
    const auth = {
      surfaceScopes: async () => new Set(['admin:write'])
    };
    expect(hasScopeChecks(auth)).toBe(false);
  });

  it('should return false when surfaceScopes is missing (security fix)', () => {
    const auth = {
      requiredScope: 'admin:write'
    };
    expect(hasScopeChecks(auth)).toBe(false);
  });

  it('should return false when both are missing', () => {
    const auth = {};
    expect(hasScopeChecks(auth)).toBe(false);
  });

  it('should return false when requiredScope is null', () => {
    const auth = {
      requiredScope: null,
      surfaceScopes: async () => new Set(['admin:write'])
    };
    expect(hasScopeChecks(auth)).toBe(false);
  });

  it('should return false when surfaceScopes is null', () => {
    const auth = {
      requiredScope: 'admin:write',
      surfaceScopes: null
    };
    expect(hasScopeChecks(auth)).toBe(false);
  });

  it('should return false when requiredScope is undefined', () => {
    const auth = {
      requiredScope: undefined,
      surfaceScopes: async () => new Set(['admin:write'])
    };
    expect(hasScopeChecks(auth)).toBe(false);
  });

  it('should return false when surfaceScopes is undefined', () => {
    const auth = {
      requiredScope: 'admin:write',
      surfaceScopes: undefined
    };
    expect(hasScopeChecks(auth)).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(hasScopeChecks(null)).toBe(false);
    expect(hasScopeChecks(undefined)).toBe(false);
    expect(hasScopeChecks('string')).toBe(false);
    expect(hasScopeChecks(123)).toBe(false);
    expect(hasScopeChecks(true)).toBe(false);
  });

  it('should work with scopeHeirarchy present', () => {
    const auth = {
      requiredScope: 'admin:write',
      scopeHeirarchy: ['admin', 'admin:write', 'admin:read'],
      surfaceScopes: async () => new Set(['admin:write'])
    };
    expect(hasScopeChecks(auth)).toBe(true);
  });
});
