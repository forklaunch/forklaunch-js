import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import { number, SchemaValidator, string } from '@forklaunch/framework-core';
import { Migrator } from '@mikro-orm/migrations';
// import { MongoDriver } from '@mikro-orm/mongodb';
// import { MySqlDriver } from '@mikro-orm/mysql';
import { Platform, TextType, Type } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import dotenv from 'dotenv';
// import { SqliteDriver } from '@mikro-orm/sqlite';
import * as entities from './models/persistence';

dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });

const configInjector = new ConfigInjector(
  SchemaValidator(),
  {
    dbName: string,
    host: string,
    user: string,
    password: string,
    port: number,
    environment: string
  },
  {
    dbName: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_NAME')
    },
    host: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_HOST')
    },
    user: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_USER')
    },
    password: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_PASSWORD')
    },
    port: {
      lifetime: Lifetime.Singleton,
      value: Number(getEnvVar('DB_PORT'))
    },
    environment: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('ENV')
    }
  }
);

const validConfigInjector = configInjector.validateConfigSingletons(
  getEnvVar('ENV_FILE_PATH') ?? '.env'
);

const mikroOrmOptionsConfig = {
  driver: PostgreSqlDriver,
  dbName: validConfigInjector.resolve('dbName'),
  host: validConfigInjector.resolve('host'),
  user: validConfigInjector.resolve('user'),
  password: validConfigInjector.resolve('password'),
  port: validConfigInjector.resolve('port'),
  entities: Object.values(entities),
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
  extensions: [Migrator],
  discovery: {
    getMappedType(type: string, platform: Platform) {
      switch (type.toLowerCase()) {
        case 'string':
        case 'text':
          return Type.getType(TextType);
        default:
          return platform.getDefaultMappedType(type);
      }
    }
  }
};

export default mikroOrmOptionsConfig;
