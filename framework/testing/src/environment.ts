import { StartedTestContainer } from 'testcontainers';
import { DatabaseType } from './containers';

export interface TestEnvConfig {
  database: StartedTestContainer | null;
  databaseType: DatabaseType;
  redis?: StartedTestContainer;
  hmacSecret?: string;
  customVars?: Record<string, string>;
}

/**
 * Get the default port for a database type
 */
function getDatabasePort(type: DatabaseType): number {
  switch (type) {
    case 'postgres':
    case 'postgresql':
      return 5432;
    case 'mysql':
    case 'mariadb':
      return 3306;
    case 'mongodb':
    case 'mongo':
      return 27017;
    case 'mssql':
      return 1433;
    case 'sqlite':
    case 'better-sqlite':
    case 'libsql':
      return 0; // SQLite is file-based, no port
    default:
      return 5432;
  }
}

/**
 * Setup test environment variables for a blueprint test
 */
export function setupTestEnvironment(config: TestEnvConfig): void {
  const {
    database,
    databaseType,
    redis,
    hmacSecret = 'test-secret-key',
    customVars = {}
  } = config;

  const dbPort = getDatabasePort(databaseType);

  // Database environment variables
  process.env.DB_NAME = 'test_db';

  // SQLite databases are file-based, no container needed
  if (
    databaseType === 'sqlite' ||
    databaseType === 'better-sqlite' ||
    databaseType === 'libsql'
  ) {
    process.env.DB_PATH = ':memory:'; // In-memory SQLite for tests
  } else if (database) {
    process.env.DB_HOST = database.getHost();
    process.env.DB_USER = databaseType === 'mssql' ? 'SA' : 'test_user';
    process.env.DB_PASSWORD =
      databaseType === 'mssql' ? 'Test_Password123!' : 'test_password';
    process.env.DB_PORT = database.getMappedPort(dbPort).toString();
  }

  // Redis environment variables (if provided)
  if (redis) {
    process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
  }

  // Standard test environment variables
  process.env.HMAC_SECRET_KEY = hmacSecret;
  process.env.JWKS_PUBLIC_KEY_URL =
    'http://localhost:3000/.well-known/jwks.json';
  process.env.OTEL_SERVICE_NAME = 'test-service';
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
  process.env.HOST = 'localhost';
  process.env.PORT = '3000';
  process.env.NODE_ENV = 'test';
  process.env.VERSION = 'v1';
  process.env.DOCS_PATH = '/docs';
  process.env.OTEL_LEVEL = 'info';
  process.env.DOTENV_FILE_PATH = '.env.test';

  // Custom environment variables
  Object.entries(customVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}
