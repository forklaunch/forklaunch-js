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
  HOST: string,
  PORT: number,
  VERSION: optional(string),
  DOCS_PATH: optional(string),
  PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH: string,
  OTEL_SERVICE_NAME: string,
  OTEL_LEVEL: optional(string),
  OTEL_EXPORTER_OTLP_ENDPOINT: string,
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
        HOST: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('HOST')
        },
        PORT: {
          lifetime: Lifetime.Singleton,
          value: Number(getEnvVar('PORT'))
        },
        VERSION: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('VERSION') ?? 'v1'
        },
        DOCS_PATH: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('DOCS_PATH') ?? '/docs'
        },
        PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH')
        },
        OTEL_SERVICE_NAME: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('OTEL_SERVICE_NAME')
        },
        OTEL_LEVEL: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('OTEL_LEVEL') || 'info'
        },
        OTEL_EXPORTER_OTLP_ENDPOINT: {
          lifetime: Lifetime.Singleton,
          value: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT')
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
          factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
            new OpenTelemetryCollector(
              OTEL_SERVICE_NAME,
              OTEL_LEVEL || 'info',
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
              PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH,
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
              PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH,
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
