import { getEnvVar } from '@forklaunch/core/services';
import { MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import { createDepenencies } from './dependencies';
import mikroOrmOptionsConfig from './mikro-orm.config';

// ! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ReturnType<typeof createDepenencies>['serviceDependencies'],
    tokens: ReturnType<typeof createDepenencies>['tokens'],
    serviceSchemas: ReturnType<typeof createDepenencies>['serviceSchemas']
  ) => void | Promise<void>
) {
  const envFilePath = getEnvVar('ENV_FILE_PATH');
  dotenv.config({ path: envFilePath });
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    const { serviceDependencies, tokens, serviceSchemas } = createDepenencies({
      orm
    });
    callback(
      serviceDependencies.validateConfigSingletons(envFilePath),
      tokens,
      serviceSchemas
    );
  });
}
