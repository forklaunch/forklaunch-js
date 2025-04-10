import { number, SchemaValidator, string } from '@forklaunch/blueprint-core';
import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import { Migrator } from '@mikro-orm/migrations';
// import { MongoDriver } from '@mikro-orm/mongodb';
// import { MySqlDriver } from '@mikro-orm/mysql';
import { MikroORMOptions, Platform, TextType, Type } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import dotenv from 'dotenv';
// import { SqliteDriver } from '@mikro-orm/sqlite';
import * as entities from './models/persistence';

dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });

const configInjector = new ConfigInjector(SchemaValidator(), {
  DB_NAME: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('DB_NAME')
  },
  DB_HOST: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('DB_HOST')
  },
  DB_USER: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('DB_USER')
  },
  DB_PASSWORD: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('DB_PASSWORD')
  },
  DB_PORT: {
    lifetime: Lifetime.Singleton,
    type: number,
    value: Number(getEnvVar('DB_PORT'))
  },
  ENV: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('ENV')
  }
});

export const validConfigInjector = configInjector.validateConfigSingletons(
  getEnvVar('ENV_FILE_PATH') ?? '.env'
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
  },
  seeder: {
    path: 'dist/models',
    glob: 'seeder.js'
  }
};

export default mikroOrmOptionsConfig;
