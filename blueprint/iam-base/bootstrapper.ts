import { getEnvVar } from '@forklaunch/common';
import { MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import mikroOrmOptionsConfig from './mikro-orm.config';
import { createDependencies } from './registrations';

export function bootstrap(
  callback: (
    ci: ReturnType<typeof createDependencies>['serviceDependencies'],
    tokens: ReturnType<typeof createDependencies>['tokens']
  ) => void | Promise<void>
) {
  const envFilePath = getEnvVar('DOTENV_FILE_PATH');
  dotenv.config({ path: envFilePath });
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    const { serviceDependencies, tokens } = createDependencies(orm);
    callback(serviceDependencies.validateConfigSingletons(envFilePath), tokens);
  });
}
