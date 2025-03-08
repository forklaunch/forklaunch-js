import { OpenTelemetryCollector } from '@forklaunch/core/http';
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
import { metrics } from '@forklaunch/framework-monitoring';
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
  docsPath: optional(string),
  passwordEncryptionPublicKeyPath: string,
  entityManager: EntityManager,
  openTelemetryCollector: OpenTelemetryCollector,
  organizationService: BaseOrganizationService,
  permissionService: BasePermissionService,
  roleService: BaseRoleService,
  userService: BaseUserService
};

export function bootstrap(
  callback: (
    ci: ValidConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });

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
          value: getEnvVar('VERSION') ?? 'v1'
        },
        docsPath: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('DOCS_PATH') ?? '/docs'
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
        openTelemetryCollector: {
          lifetime: Lifetime.Singleton,
          value: new OpenTelemetryCollector(
            getEnvVar('OTEL_SERVICE_NAME'),
            getEnvVar('OTEL_LEVEL') || 'info',
            metrics
          )
        },
        organizationService: {
          lifetime: Lifetime.Scoped,
          factory: (
            { entityManager, openTelemetryCollector },
            resolve,
            context
          ) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BaseOrganizationService(em, openTelemetryCollector);
          }
        },
        permissionService: {
          lifetime: Lifetime.Scoped,
          factory: (
            { entityManager, openTelemetryCollector },
            resolve,
            context
          ) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BasePermissionService(
              em,
              () => resolve('roleService', context),
              openTelemetryCollector
            );
          }
        },
        roleService: {
          lifetime: Lifetime.Scoped,
          factory: (
            { entityManager, openTelemetryCollector },
            resolve,
            context
          ) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BaseRoleService(
              em,
              () => resolve('permissionService', context),
              openTelemetryCollector
            );
          }
        },
        userService: {
          lifetime: Lifetime.Scoped,
          factory: (
            {
              entityManager,
              passwordEncryptionPublicKeyPath,
              openTelemetryCollector
            },
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
              () => resolve('organizationService', context),
              openTelemetryCollector
            );
          }
        }
      }
    );
    callback(
      configInjector.validateConfigSingletons(getEnvVar('ENV_FILE_PATH'))
    );
  });
}
