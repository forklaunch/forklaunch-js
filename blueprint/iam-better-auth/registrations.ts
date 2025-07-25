import {
  array,
  ExpressOptions,
  number,
  optional,
  promise,
  SchemaValidator,
  string,
  type
} from '@forklaunch/blueprint-core';
import { Metrics, metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  createConfigInjector,
  DependencyShapes,
  getEnvVar,
  Lifetime
} from '@forklaunch/core/services';
import {
  BaseOrganizationServiceSchemas,
  BasePermissionServiceSchemas,
  BaseRoleServiceSchemas,
  BaseUserServiceSchemas
} from '@forklaunch/implementation-iam-base/schemas';
import {
  BaseOrganizationService,
  BasePermissionService,
  BaseRoleService,
  BaseUserService
} from '@forklaunch/implementation-iam-base/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { BetterAuthConfig, betterAuthConfig } from './auth';
import { OrganizationStatus } from './domain/enum/organizationStatus.enum';
import {
  CreateOrganizationMapper,
  OrganizationMapper,
  UpdateOrganizationMapper
} from './domain/mappers/organization.mappers';
import {
  CreatePermissionMapper,
  PermissionMapper,
  UpdatePermissionMapper
} from './domain/mappers/permission.mappers';
import {
  CreateRoleMapper,
  RoleEntityMapper,
  RoleMapper,
  UpdateRoleMapper
} from './domain/mappers/role.mappers';
import {
  CreateUserMapper,
  UpdateUserMapper,
  UserMapper
} from './domain/mappers/user.mappers';
import {
  OrganizationMapperTypes,
  PermissionMapperTypes,
  RoleMapperTypes,
  UserMapperTypes
} from './domain/types/iamMappers.types';
import mikroOrmOptionsConfig from './mikro-orm.config';
//! defines the schemas for the organization service
export const OrganizationSchemas = BaseOrganizationServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
export const PermissionSchemas = BasePermissionServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
export const RoleSchemas = BaseRoleServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
export const UserSchemas = BaseUserServiceSchemas({
  uuidId: true,
  validator: SchemaValidator()
});
//! defines the configuration schema for the application
export function createDependencies() {
  const configInjector = createConfigInjector(SchemaValidator(), {
    SERVICE_METADATA: {
      lifetime: Lifetime.Singleton,
      type: {
        name: string,
        version: string
      },
      value: {
        name: 'iam',
        version: '0.1.0'
      }
    }
  });
  //! defines the environment configuration for the application
  const environmentConfig = configInjector.chain({
    HOST: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('HOST')
    },
    PORT: {
      lifetime: Lifetime.Singleton,
      type: number,
      value: Number(getEnvVar('PORT'))
    },
    VERSION: {
      lifetime: Lifetime.Singleton,
      type: optional(string),
      value: getEnvVar('VERSION') ?? 'v1'
    },
    DOCS_PATH: {
      lifetime: Lifetime.Singleton,
      type: optional(string),
      value: getEnvVar('DOCS_PATH') ?? '/docs'
    },
    OTEL_SERVICE_NAME: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('OTEL_SERVICE_NAME')
    },
    OTEL_LEVEL: {
      lifetime: Lifetime.Singleton,
      type: optional(string),
      value: getEnvVar('OTEL_LEVEL') ?? 'info'
    },
    OTEL_EXPORTER_OTLP_ENDPOINT: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT')
    },
    PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH')
    },
    PASSWORD_ENCRYPTION_SECRET_PATH: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('PASSWORD_ENCRYPTION_SECRET_PATH')
    },
    BETTER_AUTH_BASE_PATH: {
      lifetime: Lifetime.Singleton,
      type: string,
      value: getEnvVar('BETTER_AUTH_BASE_PATH') ?? '/api/auth'
    },
    CORS_ORIGINS: {
      lifetime: Lifetime.Singleton,
      type: array(string),
      value: getEnvVar('CORS_ORIGINS')?.split(',')
    }
  });
  //! defines the runtime dependencies for the application
  const runtimeDependencies = environmentConfig.chain({
    MikroORM: {
      lifetime: Lifetime.Singleton,
      type: MikroORM,
      factory: () => MikroORM.initSync(mikroOrmOptionsConfig)
    },
    OpenTelemetryCollector: {
      lifetime: Lifetime.Singleton,
      type: OpenTelemetryCollector<Metrics>,
      factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
        new OpenTelemetryCollector(
          OTEL_SERVICE_NAME,
          OTEL_LEVEL || 'info',
          metrics
        )
    },
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: ({ MikroORM }, _resolve, context) =>
        MikroORM.em.fork(
          context?.entityManagerOptions as ForkOptions | undefined
        )
    },
    BetterAuth: {
      lifetime: Lifetime.Singleton,
      type: type<ReturnType<typeof betterAuth<BetterAuthConfig>>>(),
      factory: ({
        BETTER_AUTH_BASE_PATH,
        PASSWORD_ENCRYPTION_SECRET_PATH,
        CORS_ORIGINS,
        MikroORM,
        OpenTelemetryCollector
      }) =>
        betterAuth(
          betterAuthConfig({
            BETTER_AUTH_BASE_PATH,
            PASSWORD_ENCRYPTION_SECRET_PATH,
            CORS_ORIGINS,
            orm: MikroORM,
            openTelemetryCollector: OpenTelemetryCollector
          })
        )
    },
    ExpressOptions: {
      lifetime: Lifetime.Singleton,
      type: promise(type<ExpressOptions<undefined>>()),
      factory: async ({ BETTER_AUTH_BASE_PATH, CORS_ORIGINS, BetterAuth }) => {
        const betterAuthOpenAPIContent =
          await BetterAuth.api.generateOpenAPISchema();

        return {
          cors: {
            origin: CORS_ORIGINS,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            credentials: true
          },
          docs: {
            type: 'scalar' as const,
            sources: [
              {
                name: 'BetterAuth',
                content: {
                  ...betterAuthOpenAPIContent,
                  paths: Object.fromEntries(
                    Object.entries(betterAuthOpenAPIContent.paths).map(
                      ([key, value]) => [
                        `${BETTER_AUTH_BASE_PATH}${key}`,
                        value
                      ]
                    )
                  )
                }
              }
            ]
          }
        };
      }
    }
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({
    OrganizationService: {
      lifetime: Lifetime.Scoped,
      type: BaseOrganizationService<
        SchemaValidator,
        typeof OrganizationStatus,
        OrganizationMapperTypes
      >,
      factory: ({ EntityManager, OpenTelemetryCollector }, resolve, context) =>
        new BaseOrganizationService(
          context.entityManagerOptions
            ? resolve('EntityManager', context)
            : EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            OrganizationMapper,
            CreateOrganizationMapper,
            UpdateOrganizationMapper
          }
        )
    },
    PermissionService: {
      lifetime: Lifetime.Scoped,
      type: BasePermissionService<SchemaValidator, PermissionMapperTypes>,
      factory: ({ EntityManager, OpenTelemetryCollector }, resolve, context) =>
        new BasePermissionService(
          context.entityManagerOptions
            ? resolve('EntityManager', context)
            : EntityManager,
          () => resolve('RoleService', context),
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            PermissionMapper,
            CreatePermissionMapper,
            UpdatePermissionMapper,
            RoleEntityMapper
          }
        )
    },
    RoleService: {
      lifetime: Lifetime.Scoped,
      type: BaseRoleService<SchemaValidator, RoleMapperTypes>,
      factory: ({ EntityManager, OpenTelemetryCollector }, resolve, context) =>
        new BaseRoleService(
          context.entityManagerOptions
            ? resolve('EntityManager', context)
            : EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            RoleMapper,
            CreateRoleMapper,
            UpdateRoleMapper
          }
        )
    },
    UserService: {
      lifetime: Lifetime.Scoped,
      type: BaseUserService<
        SchemaValidator,
        typeof OrganizationStatus,
        UserMapperTypes,
        {
          UserMapper: UserMapper['dto'];
          CreateUserMapper: CreateUserMapper['dto'];
          UpdateUserMapper: UpdateUserMapper['dto'];
        }
      >,
      factory: (
        {
          EntityManager,
          OpenTelemetryCollector,
          PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH
        },
        resolve,
        context
      ) =>
        new BaseUserService(
          EntityManager,
          PASSWORD_ENCRYPTION_PUBLIC_KEY_PATH,
          () => resolve('RoleService', context),
          () => resolve('OrganizationService', context),
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            UserMapper,
            CreateUserMapper,
            UpdateUserMapper
          }
        )
    }
  });
  //! returns the various dependencies for the application
  return {
    environmentConfig,
    runtimeDependencies,
    serviceDependencies,
    tokens: serviceDependencies.tokens()
  };
}
//! defines the type for the service dependencies
export type SchemaDependencies = DependencyShapes<typeof createDependencies>;
