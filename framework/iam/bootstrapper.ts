import {
  ConfigInjector,
  getEnvVar,
  Lifetime,
  ValidConfigInjector
} from '@forklaunch/core/services';
import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { prettyPrintParseErrors } from '@forklaunch/validator';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import mikroOrmOptionsConfig from './mikro-orm.config';
import BaseOrganizationService from './services/organization.service';
import BasePermissionService from './services/permission.service';
import BaseRoleService from './services/role.service';
import BaseUserService from './services/user.service';

export const configValidator = {
  host: string,
  port: number,
  version: optional(string),
  swaggerPath: optional(string),
  passwordEncryptionPublicKeyPath: string,
  entityManager: EntityManager,
  organizationService: BaseOrganizationService,
  permissionService: BasePermissionService,
  roleService: BaseRoleService,
  userService: BaseUserService
};

export function bootstrap(
  envFilePath: string,
  callback: (
    ci: ValidConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    dotenv.config({ path: envFilePath });

    const configInjector = new ConfigInjector(
      SchemaValidator(),
      configValidator,
      {
        host: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('HOST')
        },
        port: {
          lifetime: Lifetime.Singleton,
          value: Number(getEnvVar('PORT'))
        },
        version: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('VERSION')
        },
        swaggerPath: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('SWAGGER_PATH')
        },
        passwordEncryptionPublicKeyPath: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH')
        },
        entityManager: {
          lifetime: Lifetime.Scoped,
          factory: (_args, _resolve, context) =>
            orm.em.fork(
              context?.entityManagerOptions as ForkOptions | undefined
            )
        },
        organizationService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager }, resolve, context) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BaseOrganizationService(em);
          }
        },
        permissionService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager }, resolve, context) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BasePermissionService(em, () =>
              resolve('roleService', context)
            );
          }
        },
        roleService: {
          lifetime: Lifetime.Scoped,
          factory: ({ entityManager }, resolve, context) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BaseRoleService(em, () =>
              resolve('permissionService', context)
            );
          }
        },
        userService: {
          lifetime: Lifetime.Scoped,
          factory: (
            { entityManager, passwordEncryptionPublicKeyPath },
            resolve,
            context
          ) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BaseUserService(
              em,
              passwordEncryptionPublicKeyPath,
              () => resolve('roleService', context),
              () => resolve('organizationService', context)
            );
          }
        }
      }
    );

    const maybeValidConfigInjectorResult =
      configInjector.validateConfigSingletons();
    if (maybeValidConfigInjectorResult.ok) {
      console.log(
        'Valid config injector result',
        maybeValidConfigInjectorResult.value
      );
      callback(maybeValidConfigInjectorResult.value);
    } else {
      throw new Error(
        prettyPrintParseErrors(maybeValidConfigInjectorResult.errors, '.env')
      );
    }
  });
}
