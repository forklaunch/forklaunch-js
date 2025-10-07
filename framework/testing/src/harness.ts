import { MikroORM, Options } from '@mikro-orm/core';
import Redis from 'ioredis';
import { StartedTestContainer } from 'testcontainers';
import { DatabaseType, TestContainerManager } from './containers';
import { clearTestDatabase, setupTestORM } from './database';
import { setupTestEnvironment } from './environment';

export interface BlueprintTestConfig {
  /**
   * Function that imports and returns the MikroORM config
   * This is called AFTER environment variables are set
   */
  getConfig: () => Promise<Options>;

  /**
   * Database type (postgres, mysql, mongodb, etc.)
   * @default 'postgres'
   */
  databaseType?: DatabaseType;

  /**
   * Whether to use migrations (true) or schema generation (false)
   */
  useMigrations?: boolean;

  /**
   * Path to migrations directory (required if useMigrations is true)
   */
  migrationsPath?: string;

  /**
   * Whether the blueprint needs Redis
   */
  needsRedis?: boolean;

  /**
   * Custom environment variables to set
   */
  customEnvVars?: Record<string, string>;

  /**
   * Custom setup hook called after containers and ORM are initialized
   */
  onSetup?: (setup: TestSetupResult) => Promise<void>;
}

export interface TestSetupResult {
  container: StartedTestContainer | null;
  redisContainer?: StartedTestContainer;
  orm: MikroORM;
  redis?: Redis;
}

/**
 * Complete test harness for blueprint E2E testing
 *
 * Handles container setup, environment configuration, and database initialization
 *
 * @example
 * ```typescript
 * const harness = new BlueprintTestHarness({
 *   mikroOrmConfigPath: '../mikro-orm.config',
 *   useMigrations: false,
 *   needsRedis: true,
 *   customEnvVars: {
 *     STRIPE_API_KEY: 'sk_test_...'
 *   }
 * });
 *
 * const setup = await harness.setup();
 * // ... run tests
 * await harness.cleanup();
 * ```
 */
export class BlueprintTestHarness {
  private containers: TestContainerManager;
  private result?: TestSetupResult;

  constructor(private config: BlueprintTestConfig) {
    this.containers = new TestContainerManager();
  }

  /**
   * Setup all test infrastructure (containers, ORM, Redis)
   */
  async setup(): Promise<TestSetupResult> {
    const databaseType = this.config.databaseType || 'postgres';

    // Setup database container
    const container =
      await this.containers.setupDatabaseContainer(databaseType);

    // Setup Redis container if needed
    const redisContainer = this.config.needsRedis
      ? await this.containers.setupRedisContainer()
      : undefined;

    // Setup environment variables
    setupTestEnvironment({
      database: container,
      databaseType,
      redis: redisContainer,
      customVars: this.config.customEnvVars
    });

    // Get the config AFTER environment is set
    const mikroOrmConfig = await this.config.getConfig();

    // Setup ORM
    const orm = await setupTestORM({
      mikroOrmConfig,
      databaseType,
      useMigrations: this.config.useMigrations,
      migrationsPath: this.config.migrationsPath,
      container
    });

    // Setup Redis client if needed
    let redis: Redis | undefined;
    if (redisContainer) {
      redis = new Redis({
        host: redisContainer.getHost(),
        port: redisContainer.getMappedPort(6379),
        maxRetriesPerRequest: 3
      });
      await redis.ping();
    }

    this.result = { container, redisContainer, orm, redis };

    // Call custom setup hook
    if (this.config.onSetup) {
      await this.config.onSetup(this.result);
    }

    return this.result;
  }

  /**
   * Cleanup all test infrastructure
   */
  async cleanup(): Promise<void> {
    if (this.result?.redis) {
      await this.result.redis.quit();
    }
    if (this.result?.orm) {
      await this.result.orm.close();
    }
    await this.containers.cleanup();
    this.result = undefined;
  }

  /**
   * Clear all data from the database
   */
  async clearDatabase(): Promise<void> {
    if (this.result) {
      await clearTestDatabase(this.result.orm, this.result.redis);
    }
  }
}
