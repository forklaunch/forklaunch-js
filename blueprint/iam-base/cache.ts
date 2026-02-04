/**
 * IAM Cache Entry Point
 * Exports only cache service - no entities, no MikroORM discovery
 */

export interface CacheLike {
  readRecord<T>(key: string): Promise<{ value: T }>;
  putRecord<T>(record: {
    key: string;
    value: T;
    ttlMilliseconds: number;
  }): Promise<void>;
  deleteRecord(key: string): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
  deleteBatchRecords(keys: string[]): Promise<void>;
}

export interface AuthCacheService {
  /**
   * Get cached roles for a user
   */
  getCachedRoles(userId: string): Promise<Set<string> | null>;

  /**
   * Cache roles for a user
   */
  setCachedRoles(userId: string, roles: Set<string>): Promise<void>;

  /**
   * Get cached permissions for a user
   */
  getCachedPermissions(userId: string): Promise<Set<string> | null>;

  /**
   * Cache permissions for a user
   */
  setCachedPermissions(userId: string, permissions: Set<string>): Promise<void>;

  /**
   * Delete cached roles for a user
   */
  deleteCachedRoles(userId: string): Promise<void>;

  /**
   * Delete cached permissions for a user
   */
  deleteCachedPermissions(userId: string): Promise<void>;

  /**
   * Delete all cached data for a user
   */
  deleteAllCachedData(userId: string): Promise<void>;

  /**
   * Delete cached data for all users with a specific prefix
   */
  deleteByPrefix(prefix: string): Promise<void>;

  /**
   * Get cached roles for an organization
   */
  getCachedOrganizationRoles(organizationId: string): Promise<string[] | null>;

  /**
   * Cache roles for an organization
   */
  setCachedOrganizationRoles(
    organizationId: string,
    roles: string[]
  ): Promise<void>;

  /**
   * Delete cached roles for an organization
   */
  deleteCachedOrganizationRoles(organizationId: string): Promise<void>;
}

/**
 * Create an AuthCacheService instance
 */
export function createAuthCacheService(cache: CacheLike): AuthCacheService {
  const ROLES_CACHE_PREFIX = 'auth:roles:';
  const PERMISSIONS_CACHE_PREFIX = 'auth:permissions:';
  const ORG_ROLES_CACHE_PREFIX = 'auth:org-roles:';
  const TTL = 60 * 60 * 1000; // 1 hour

  return {
    async getCachedRoles(userId: string) {
      try {
        const result = await cache.readRecord<string[]>(
          `${ROLES_CACHE_PREFIX}${userId}`
        );
        return new Set(result.value);
      } catch {
        return null;
      }
    },

    async setCachedRoles(userId: string, roles: Set<string>) {
      await cache.putRecord({
        key: `${ROLES_CACHE_PREFIX}${userId}`,
        value: Array.from(roles),
        ttlMilliseconds: TTL
      });
    },

    async getCachedPermissions(userId: string) {
      try {
        const result = await cache.readRecord<string[]>(
          `${PERMISSIONS_CACHE_PREFIX}${userId}`
        );
        return new Set(result.value);
      } catch {
        return null;
      }
    },

    async setCachedPermissions(userId: string, permissions: Set<string>) {
      await cache.putRecord({
        key: `${PERMISSIONS_CACHE_PREFIX}${userId}`,
        value: Array.from(permissions),
        ttlMilliseconds: TTL
      });
    },

    async deleteCachedRoles(userId: string) {
      await cache.deleteRecord(`${ROLES_CACHE_PREFIX}${userId}`);
    },

    async deleteCachedPermissions(userId: string) {
      await cache.deleteRecord(`${PERMISSIONS_CACHE_PREFIX}${userId}`);
    },

    async deleteAllCachedData(userId: string) {
      await this.deleteCachedRoles(userId);
      await this.deleteCachedPermissions(userId);
    },

    async deleteByPrefix(prefix: string) {
      const keys = await cache.listKeys(prefix);
      if (keys.length > 0) {
        await cache.deleteBatchRecords(keys);
      }
    },

    // Organization-level caching methods
    async getCachedOrganizationRoles(organizationId: string) {
      try {
        const result = await cache.readRecord<string[]>(
          `${ORG_ROLES_CACHE_PREFIX}${organizationId}`
        );
        return result.value;
      } catch {
        return null;
      }
    },

    async setCachedOrganizationRoles(organizationId: string, roles: string[]) {
      await cache.putRecord({
        key: `${ORG_ROLES_CACHE_PREFIX}${organizationId}`,
        value: roles,
        ttlMilliseconds: TTL
      });
    },

    async deleteCachedOrganizationRoles(organizationId: string) {
      await cache.deleteRecord(`${ORG_ROLES_CACHE_PREFIX}${organizationId}`);
    }
  };
}
