import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { Migrator } from '@mikro-orm/migrations';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { number, SchemaValidator, string } from '@{{app_name}}/core';
import { {{db_driver}} } from '@mikro-orm/{{database}}';

// configInjector instance that makes it easy to resolve the configuration values
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
      value: process.env.DB_NAME ?? '{{app_name}}-dev'
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

// validates the configuration singletons
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

// mikroOrmOptionsConfig object that defines the options for the MikroORM instance
const mikroOrmOptionsConfig = {
  driver: {{db_driver}},
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

// exports the mikroOrmOptionsConfig object
export default mikroOrmOptionsConfig;

