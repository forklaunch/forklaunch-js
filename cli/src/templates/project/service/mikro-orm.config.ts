import { createConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import { Migrator } from '@mikro-orm/migrations{{#is_mongo}}-mongodb{{/is_mongo}}';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { number, SchemaValidator, string } from '@{{app_name}}/core';{{^is_mongo}}
import { defineConfig, Platform, TextType, Type } from '@mikro-orm/core';{{/is_mongo}}
import { {{db_driver}} } from '@mikro-orm/{{database}}';
import dotenv from 'dotenv';
import * as entities from './persistence/entities';

dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });

const configInjector = createConfigInjector(
  SchemaValidator(),
  {
    DB_NAME: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('DB_NAME')
    }, {{^is_in_memory_database}}
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
    }, {{/is_in_memory_database}}
    ENV: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('ENV')
    }
  }
);

export const validConfigInjector = configInjector.validateConfigSingletons(
  getEnvVar('ENV_FILE_PATH')
);{{#is_mongo}}

const clientUrl = `mongodb://${validConfigInjector.resolve(
    'DB_USER'
  )}:${validConfigInjector.resolve('DB_PASSWORD')}@${validConfigInjector.resolve(
    'DB_HOST'
  )}:${validConfigInjector.resolve('DB_PORT')}/${validConfigInjector.resolve(
    'DB_NAME'
  )}?authSource=admin&directConnection=true&replicaSet=rs0`
{{/is_mongo}}
const mikroOrmOptionsConfig = defineConfig({
  driver: {{db_driver}},{{#is_mongo}}
  clientUrl,{{/is_mongo}}{{^is_mongo}}
  dbName: validConfigInjector.resolve('DB_NAME'),{{^is_in_memory_database}}
  host: validConfigInjector.resolve('DB_HOST'),
  user: validConfigInjector.resolve('DB_USER'),
  password: validConfigInjector.resolve('DB_PASSWORD'),
  port: validConfigInjector.resolve('DB_PORT'),{{/is_in_memory_database}}{{/is_mongo}}
  entities: Object.values(entities),
  metadataProvider: TsMorphMetadataProvider,
  debug: validConfigInjector.resolve('ENV') === 'development',
  extensions: [Migrator],{{^is_mongo}}
  discovery: {
    getMappedType(type: string, platform: Platform) {
      // override the mapping for string properties only
      if (type === 'string') {
        return Type.getType(TextType);
      }

      return platform.getDefaultMappedType(type);
    }
  },{{/is_mongo}}
  migrations: {
    path: 'dist/migrations-{{database}}',
    pathTs: 'migrations-{{database}}'
  },
  seeder: {
    path: 'dist/persistence',
    glob: 'seeder.js'
  }
});

export default mikroOrmOptionsConfig;

