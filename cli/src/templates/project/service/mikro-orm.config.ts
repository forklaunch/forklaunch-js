import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { Migrator } from '@mikro-orm/migrations';
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
    port: number
  },
  {
    dbName: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_NAME ?? '{{app_name}}-dev-{{service_name}}'
    },
    host: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_HOST ?? 'localhost'
    },
    user: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_USER ?? '{{database}}'
    },
    password: {
      lifetime: Lifetime.Singleton,
      value: process.env.DB_PASSWORD ?? '{{database}}'
    },
    port: {
      lifetime: Lifetime.Singleton,
      value: Number(process.env.DB_PORT ?? {{#is_postgres}}5432{{/is_postgres}}{{#is_mongo}}27017{{/is_mongo}})
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

