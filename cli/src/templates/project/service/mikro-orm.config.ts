import { ConfigInjector, getEnvVar, Lifetime } from '@forklaunch/core/services';
import { Migrator } from '@mikro-orm/migrations{{#is_mongo}}-mongodb{{/is_mongo}}';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { number, SchemaValidator, string } from '@{{app_name}}/core';{{^is_mongo}}
import { Platform, TextType, Type } from '@mikro-orm/core';{{/is_mongo}}
import { {{db_driver}} } from '@mikro-orm/{{database}}';

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
      value: getEnvVar('NODE_ENV')
    }
  }
);

const validConfigInjector = configInjector.validateConfigSingletons(
  getEnvVar('ENV_FILE_PATH')
);{{#is_mongo}}

const clientUrl = `mongodb://${validConfigInjector.resolve(
    'user'
  )}:${validConfigInjector.resolve('password')}@${validConfigInjector.resolve(
    'host'
  )}:${validConfigInjector.resolve('port')}/${validConfigInjector.resolve(
    'dbName'
  )}?authSource=admin&directConnection=true&replicaSet=rs0`
{{/is_mongo}}
const mikroOrmOptionsConfig = {
  driver: {{db_driver}},{{#is_mongo}}
  clientUrl,{{/is_mongo}}{{^is_mongo}}
  dbName: validConfigInjector.resolve('dbName'),
  host: validConfigInjector.resolve('host'),
  user: validConfigInjector.resolve('user'),
  password: validConfigInjector.resolve('password'),
  port: validConfigInjector.resolve('port'),{{/is_mongo}}
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['models/persistence/**/*.entity.ts'],
  metadataProvider: TsMorphMetadataProvider,
  debug: validConfigInjector.resolve('environment') === 'development',
  extensions: [Migrator]{{^is_mongo}},
  discovery: {
    getMappedType(type: string, platform: Platform) {
      // override the mapping for string properties only
      if (type === 'string') {
        return Type.getType(TextType);
      }

      return platform.getDefaultMappedType(type);
    }
  }{{/is_mongo}}
};

export default mikroOrmOptionsConfig;

