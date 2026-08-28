import { number, schemaValidator, string } from '@forklaunch/blueprint-core';
import {
  FieldEncryptor,
  registerEncryptor
} from '@forklaunch/core/persistence';
import {
  createConfigInjector,
  getEnvVar,
  Lifetime
} from '@forklaunch/core/services';
import { EntityClass, EntitySchema, Platform, TextType, Type } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';
import * as entities from './persistence/entities';

dotenv.config({ path: getEnvVar('DOTENV_FILE_PATH') });

const configInjector = createConfigInjector(schemaValidator, {
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
  NODE_ENV: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('NODE_ENV')
  },
  ENCRYPTION_KEY: {
    lifetime: Lifetime.Singleton,
    type: string,
    value: getEnvVar('ENCRYPTION_KEY')
  }
});

export const validConfigInjector = configInjector.validateConfigSingletons(
  getEnvVar('DOTENV_FILE_PATH')
);
const tokens = validConfigInjector.tokens();

registerEncryptor(
  new FieldEncryptor(validConfigInjector.resolve(tokens.ENCRYPTION_KEY))
);

// Explicit return-type annotation needed once the entity count/relation
// graph grows past a certain size — TS7056, the inferred type otherwise
// exceeds what the compiler will serialize.
const mikroOrmOptionsConfig: ReturnType<typeof defineConfig> = defineConfig({
  dbName: validConfigInjector.resolve(tokens.DB_NAME),
  host: validConfigInjector.resolve(tokens.DB_HOST),
  user: validConfigInjector.resolve(tokens.DB_USER),
  password: validConfigInjector.resolve(tokens.DB_PASSWORD),
  port: validConfigInjector.resolve(tokens.DB_PORT),
  // Object.values() on the entities barrel widens to unknown[]; MikroORM
  // rejects that. The annotation names the shape MikroORM accepts rather
  // than one concrete kind, matching the generated template: modules define
  // entities as schemas or as classes, and a cast to either one alone
  // rejects the other.
  entities: Object.values(entities) as (
    | EntitySchema<any>
    | EntityClass<Partial<any>>
  )[],
  discovery: {
    getMappedType(type: string, platform: Platform) {
      if (type === 'string') {
        return Type.getType(TextType);
      }

      return platform.getDefaultMappedType(type);
    }
  },
  debug: validConfigInjector.resolve(tokens.NODE_ENV) === 'development',
  extensions: [Migrator],
  seeder: {
    path: 'dist/persistence',
    glob: 'seeder.js'
  }
});

export default mikroOrmOptionsConfig;
