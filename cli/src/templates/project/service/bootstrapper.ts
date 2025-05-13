import { getEnvVar } from '@forklaunch/core/services';{{#is_database_enabled}}
import { MikroORM } from '@mikro-orm/core';{{/is_database_enabled}}
import dotenv from 'dotenv';{{#is_database_enabled}}
import mikroOrmOptionsConfig from './mikro-orm.config';{{/is_database_enabled}}
import { createDependencies } from './registrations';

// ! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ReturnType<typeof createDependencies>['serviceDependencies'],
    tokens: ReturnType<typeof createDependencies>['tokens']
  ) => void | Promise<void>
) {
  const envFilePath = getEnvVar("ENV_FILE_PATH");      
  dotenv.config({ path: envFilePath });{{#is_database_enabled}}
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    const { serviceDependencies, tokens } = createDependencies(orm);
    callback(serviceDependencies.validateConfigSingletons(envFilePath), tokens);
  });{{/is_database_enabled}}{{^is_database_enabled}}
  const { serviceDependencies, tokens } = createDependencies();
  callback(serviceDependencies.validateConfigSingletons(envFilePath), tokens);{{/is_database_enabled}}
}
