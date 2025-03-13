import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import { number, SchemaValidator, string } from '@forklaunch/framework-core';
import { Migrator } from '@mikro-orm/migrations';
// import { MongoDriver } from '@mikro-orm/mongodb';
// import { MySqlDriver } from '@mikro-orm/mysql';
import { MikroORMOptions, Platform, TextType, Type } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
// import { SqliteDriver } from '@mikro-orm/sqlite';
import dotenv from 'dotenv';
import * as entities from './models/persistence';

dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });

const configInjector = new ConfigInjector(
  SchemaValidator(),
  {
    DB_NAME: string,
    DB_HOST: string,
    DB_USER: string,
    DB_PASSWORD: string,
    DB_PORT: number,
    ENV: string
  },
  {
    DB_NAME: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_NAME')
    },
    DB_HOST: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_HOST')
    },
    DB_USER: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_USER')
    },
    DB_PASSWORD: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('DB_PASSWORD')
    },
    DB_PORT: {
      lifetime: Lifetime.Singleton,
      value: Number(getEnvVar('DB_PORT'))
    },
    ENV: {
      lifetime: Lifetime.Singleton,
      value: getEnvVar('ENV')
    }
  }
);

export const validConfigInjector = configInjector.validateConfigSingletons(
  getEnvVar('ENV_FILE_PATH')
);

const mikroOrmOptionsConfig: Partial<MikroORMOptions> = {
  driver: PostgreSqlDriver,
  dbName: validConfigInjector.resolve('DB_NAME'),
  host: validConfigInjector.resolve('DB_HOST'),
  user: validConfigInjector.resolve('DB_USER'),
  password: validConfigInjector.resolve('DB_PASSWORD'),
  port: validConfigInjector.resolve('DB_PORT'),
  entities: Object.values(entities),
  metadataProvider: TsMorphMetadataProvider,
  debug: validConfigInjector.resolve('ENV') === 'development',
  extensions: [Migrator],
  discovery: {
    getMappedType(type: string, platform: Platform) {
      if (type === 'string') {
        return Type.getType(TextType);
      }

      return platform.getDefaultMappedType(type);
    }
  },
  seeder: {
    path: 'dist/models',
    pathTs: './models',
    glob: 'seeder.{js,ts}'
  }
};

export default mikroOrmOptionsConfig;
