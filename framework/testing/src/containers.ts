import { GenericContainer, StartedTestContainer } from 'testcontainers';

export type DatabaseType =
  | 'postgres'
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'mongodb'
  | 'mongo'
  | 'mssql'
  | 'libsql'
  | 'sqlite'
  | 'better-sqlite';

export interface PostgresConfig {
  user?: string;
  password?: string;
  database?: string;
  command?: string[];
}

export interface MySQLConfig {
  user?: string;
  password?: string;
  database?: string;
  rootPassword?: string;
}

export interface MongoDBConfig {
  user?: string;
  password?: string;
  database?: string;
}

export interface MSSQLConfig {
  user?: string;
  password?: string;
  database?: string;
  saPassword?: string;
}

export interface SQLiteConfig {
  database?: string;
}

export interface RedisConfig {
  command?: string[];
}

export type DatabaseConfig =
  | PostgresConfig
  | MySQLConfig
  | MongoDBConfig
  | MSSQLConfig
  | SQLiteConfig;

/**
 * Manages test containers (PostgreSQL, MySQL, MongoDB, Redis, etc.) for E2E testing
 */
export class TestContainerManager {
  private containers: StartedTestContainer[] = [];

  /**
   * Setup database container based on type
   */
  async setupDatabaseContainer(
    type: DatabaseType,
    config: DatabaseConfig = {}
  ): Promise<StartedTestContainer | null> {
    const normalizedType = this.normalizeDatabaseType(type);

    switch (normalizedType) {
      case 'postgres':
        return this.setupPostgresContainer(config as PostgresConfig);
      case 'mysql':
        return this.setupMySQLContainer(config as MySQLConfig);
      case 'mongodb':
        return this.setupMongoDBContainer(config as MongoDBConfig);
      case 'mssql':
        return this.setupMSSQLContainer(config as MSSQLConfig);
      case 'sqlite':
        // SQLite doesn't need a container (file-based)
        return null;
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * Normalize database type aliases
   */
  private normalizeDatabaseType(
    type: DatabaseType
  ): 'postgres' | 'mysql' | 'mongodb' | 'mssql' | 'sqlite' {
    switch (type) {
      case 'postgres':
      case 'postgresql':
        return 'postgres';
      case 'mysql':
      case 'mariadb':
        return 'mysql';
      case 'mongodb':
      case 'mongo':
        return 'mongodb';
      case 'mssql':
        return 'mssql';
      case 'sqlite':
      case 'better-sqlite':
      case 'libsql':
        return 'sqlite';
      default:
        throw new Error(`Unknown database type: ${type}`);
    }
  }

  /**
   * Setup PostgreSQL test container
   */
  async setupPostgresContainer(
    config: PostgresConfig = {}
  ): Promise<StartedTestContainer> {
    const {
      user = 'test_user',
      password = 'test_password',
      database = 'test_db',
      command = ['postgres', '-c', 'log_statement=all']
    } = config;

    const container = await new GenericContainer('postgres:latest')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: user,
        POSTGRES_PASSWORD: password,
        POSTGRES_DB: database
      })
      .withCommand(command)
      .start();

    this.containers.push(container);
    return container;
  }

  /**
   * Setup MySQL test container
   */
  async setupMySQLContainer(
    config: MySQLConfig = {}
  ): Promise<StartedTestContainer> {
    const {
      user = 'test_user',
      password = 'test_password',
      database = 'test_db',
      rootPassword = 'root_password'
    } = config;

    const container = await new GenericContainer('mysql:8')
      .withExposedPorts(3306)
      .withEnvironment({
        MYSQL_ROOT_PASSWORD: rootPassword,
        MYSQL_DATABASE: database,
        MYSQL_USER: user,
        MYSQL_PASSWORD: password
      })
      .start();

    this.containers.push(container);
    return container;
  }

  /**
   * Setup MongoDB test container
   */
  async setupMongoDBContainer(
    config: MongoDBConfig = {}
  ): Promise<StartedTestContainer> {
    const {
      user = 'test_user',
      password = 'test_password',
      database = 'test_db'
    } = config;

    const container = await new GenericContainer('mongo:latest')
      .withExposedPorts(27017)
      .withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: user,
        MONGO_INITDB_ROOT_PASSWORD: password,
        MONGO_INITDB_DATABASE: database
      })
      .start();

    this.containers.push(container);
    return container;
  }

  /**
   * Setup Microsoft SQL Server test container
   */
  async setupMSSQLContainer(
    config: MSSQLConfig = {}
  ): Promise<StartedTestContainer> {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      user = 'SA',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      password = 'Test_Password123!',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      database = 'test_db',
      saPassword = 'Test_Password123!'
    } = config;

    const container = await new GenericContainer(
      'mcr.microsoft.com/mssql/server:2022-latest'
    )
      .withExposedPorts(1433)
      .withEnvironment({
        ACCEPT_EULA: 'Y',
        SA_PASSWORD: saPassword,
        MSSQL_PID: 'Developer'
      })
      .start();

    // Wait a bit for SQL Server to be ready
    await new Promise((resolve) => setTimeout(resolve, 3000));

    this.containers.push(container);
    return container;
  }

  /**
   * Setup Redis test container
   */
  async setupRedisContainer(
    config: RedisConfig = {}
  ): Promise<StartedTestContainer> {
    const { command = ['redis-server', '--appendonly', 'yes'] } = config;

    const container = await new GenericContainer('redis:latest')
      .withExposedPorts(6379)
      .withCommand(command)
      .start();

    this.containers.push(container);
    return container;
  }

  /**
   * Cleanup all containers
   */
  async cleanup(): Promise<void> {
    await Promise.all(
      this.containers.map((container) =>
        container.stop({ remove: true, removeVolumes: true }).catch(() => {
          // Ignore cleanup errors
        })
      )
    );
    this.containers = [];
  }
}
