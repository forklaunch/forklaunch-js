import { getEnvVar } from '@forklaunch/core/services';
import { MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { createDepenencies } from './registrations';

// ! bootstrap function that initializes the application
export function bootstrap(
  callback: (
    ci: ReturnType<typeof createDepenencies>['configInjector']
  ) => void | Promise<void>
) {
  const envFilePath = getEnvVar('ENV_FILE_PATH');
  dotenv.config({ path: envFilePath });
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    callback(
      createDepenencies({ orm }).configInjector.validateConfigSingletons(
        envFilePath
      )
    );
  });
}
