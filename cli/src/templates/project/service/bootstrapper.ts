import { getEnvVar } from '@forklaunch/core/services';{{^cache_backend}}
import { MikroORM } from '@mikro-orm/core';{{/cache_backend}}
import dotenv from 'dotenv';{{^cache_backend}}
import mikroOrmOptionsConfig from './mikro-orm.config';{{/cache_backend}}
import { createDepenencies } from './registrations';

// ! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ReturnType<typeof createDepenencies>['serviceDependencies'],
    tokens: ReturnType<typeof createDepenencies>['tokens']
  ) => void | Promise<void>
) {
  const envFilePath = getEnvVar("ENV_FILE_PATH");      
  dotenv.config({ path: envFilePath });{{^cache_backend}}
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    const { serviceDependencies, tokens } = createDepenencies({
      orm,
    });
    callback(serviceDependencies.validateConfigSingletons(envFilePath), tokens);
  });{{/cache_backend}}{{#cache_backend}}
  const { serviceDependencies, tokens } = createDepenencies();
  callback(serviceDependencies.validateConfigSingletons(envFilePath), tokens);{{/cache_backend}}
}
