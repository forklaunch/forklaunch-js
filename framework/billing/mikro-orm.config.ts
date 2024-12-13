import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { number, SchemaValidator, string } from '@forklaunch/framework-core';
import { Migrator } from '@mikro-orm/migrations';
// import { MongoDriver } from '@mikro-orm/mongodb';
// import { MySqlDriver } from '@mikro-orm/mysql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
// import { SqliteDriver } from '@mikro-orm/sqlite';

const configInjector = new ConfigInjector(
  SchemaValidator(),
  {
    dbName: string,
    host: string,
    user: string,
    password: string,
    port: number
  },
  {
    dbName: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_NAME ?? 'forklaunch-dev'
    },
    host: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_HOST ?? 'localhost'
    },
    user: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_USER ?? 'postgres'
    },
    password: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_PASSWORD ?? 'postgres'
    },
    port: {
      lifetime: Lifetime.Singleton,
      value: Number(process.env.DB_PORT) ?? 5432
    }
  }
);

if (
  !configInjector.validateConfigSingletons({
    dbName: process.env.DB_NAME,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT)
  })
) {
  throw new Error('Invalid environment variables supplied.');
}

const mikroOrmOptionsConfig = {
  driver: PostgreSqlDriver,
  dbName: configInjector.resolve('dbName'),
  host: configInjector.resolve('host'),
  user: configInjector.resolve('user'),
  password: configInjector.resolve('password'),
  port: configInjector.resolve('port'),
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['models/persistence/**/*.entity.ts'],
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
  extensions: [Migrator]
};

export default mikroOrmOptionsConfig;
