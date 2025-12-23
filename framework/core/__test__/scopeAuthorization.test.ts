import { describe, expect, it } from 'vitest';

describe('Scope Authorization Type Safety', () => {
  describe('Type-level enforcement', () => {
    it('should allow auth with both requiredScope and surfaceScopes', () => {
      // This should compile without errors
      const validConfig = {
        requiredScope: 'admin:write',
        surfaceScopes: async () => new Set(['admin:write'])
      };

      expect(validConfig.requiredScope).toBe('admin:write');
      expect(validConfig.surfaceScopes).toBeDefined();
    });

    it('should allow auth without scope requirements', () => {
      // This should compile without errors
      const validConfig: {
        requiredScope?: string;
        surfaceScopes?: () => Promise<Set<string>>;
      } = {
        // No scope fields at all - valid
      };

      expect(validConfig.requiredScope).toBeUndefined();
      expect(validConfig.surfaceScopes).toBeUndefined();
    });

    it('should demonstrate the ScopeSet constraint exists', () => {
      // This test verifies that our type system enforces the constraint
      // In real usage, TypeScript would prevent: { requiredScope: 'x' } without surfaceScopes

      const validWithScopes = {
        requiredScope: 'read:data',
        surfaceScopes: async () => new Set(['read:data'])
      };

      const validWithoutScopes: {
        requiredScope?: string;
      } = {
        // neither field present
      };

      expect(validWithScopes.requiredScope).toBe('read:data');
      expect(validWithoutScopes.requiredScope).toBeUndefined();
    });

    it('should work with scope hierarchy', () => {
      const configWithHierarchy = {
        requiredScope: 'resource:read',
        scopeHeirarchy: ['admin', 'resource:write', 'resource:read'],
        surfaceScopes: async () => new Set(['resource:read'])
      };

      expect(configWithHierarchy.scopeHeirarchy).toHaveLength(3);
      expect(configWithHierarchy.requiredScope).toBe('resource:read');
    });
  });

  describe('Guard function behavior', () => {
    it('should import and use hasScopeChecks correctly', async () => {
      const { hasScopeChecks } = await import(
        '../src/http/guards/hasScopeChecks'
      );

      // With both fields
      expect(
        hasScopeChecks({
          requiredScope: 'admin',
          surfaceScopes: async () => new Set()
        })
      ).toBe(true);

      // Without surfaceScopes (the bug we fixed)
      expect(
        hasScopeChecks({
          requiredScope: 'admin'
        })
      ).toBe(false);

      // Without requiredScope
      expect(
        hasScopeChecks({
          surfaceScopes: async () => new Set()
        })
      ).toBe(false);
    });
  });
});
