import { mikroOrmAdapter } from '@forklaunch/better-auth-mikro-orm-fork';
import {
  boolean,
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { metrics } from '@forklaunch/blueprint-monitoring';
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
import { array } from 'better-auth';
import { openAPI } from 'better-auth/plugins';
import { readFileSync } from 'fs';
import { BetterAuth } from './domain/betterAuth.class';
import { OrganizationStatus } from './domain/enum/organizationStatus.enum';
import {
  CreateOrganizationDtoMapper,
  OrganizationDtoMapper,
  UpdateOrganizationDtoMapper
} from './domain/mappers/organization.mappers';
import {
  CreatePermissionDtoMapper,
  PermissionDtoMapper,
  UpdatePermissionDtoMapper
} from './domain/mappers/permission.mappers';
import {
  CreateRoleDtoMapper,
  RoleDtoMapper,
  RoleEntityMapper,
  UpdateRoleDtoMapper
} from './domain/mappers/role.mappers';
import {
  CreateUserDtoMapper,
  UpdateUserDtoMapper,
  UserDtoMapper
} from './domain/mappers/user.mappers';
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
export function createDependencies(orm: MikroORM) {
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
    CORS_ORIGINS: {
      lifetime: Lifetime.Singleton,
      type: array(string),
      value: getEnvVar('CORS_ORIGINS')?.split(',')
    }
  });
  //! defines the runtime dependencies for the application
  const runtimeDependencies = environmentConfig.chain({
    ExpressOptions: {
      lifetime: Lifetime.Singleton,
      type: {
        cors: {
          origin: string,
          methods: array(string),
          credentials: boolean
        }
      },
      value: {
        cors: {
          origin: 'http://localhost:3001',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          credentials: true
        }
      }
    },
    OpenTelemetryCollector: {
      lifetime: Lifetime.Singleton,
      type: OpenTelemetryCollector,
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
      factory: (_args, _resolve, context) =>
        orm.em.fork(context?.entityManagerOptions as ForkOptions | undefined)
    },
    BetterAuth: {
      lifetime: Lifetime.Singleton,
      type: BetterAuth,
      factory: ({
        OpenTelemetryCollector,
        PASSWORD_ENCRYPTION_SECRET_PATH,
        CORS_ORIGINS
      }) =>
        new BetterAuth({
          secret: readFileSync(PASSWORD_ENCRYPTION_SECRET_PATH, 'utf8').split(
            '\n'
          )[1],
          trustedOrigins: CORS_ORIGINS,
          database: mikroOrmAdapter(orm),
          emailAndPassword: {
            enabled: true
          },
          plugins: [
            openAPI({
              disableDefaultReference: true
            })
          ],
          user: {
            additionalFields: {
              firstName: {
                type: 'string',
                required: true
              },
              lastName: {
                type: 'string',
                required: true
              },
              phoneNumber: {
                type: 'string',
                required: false
              },
              roleIds: {
                type: 'string[]',
                required: false,
                input: false
              },
              organizationId: {
                type: 'string',
                required: false,
                input: false
              }
            }
          },
          databaseHooks: {
            user: {
              create: {
                before: async (user, ctx) => {
                  return {
                    data: {
                      ...user,
                      organization: {
                        $in: ctx?.body.organizationId
                          ? [ctx?.body.organizationId]
                          : []
                      },
                      roles: {
                        $in: ctx?.body.roleIds ? ctx?.body.roleIds : []
                      }
                    }
                  };
                }
              }
            }
          },
          advanced: {
            generateId: false
          },
          logger: OpenTelemetryCollector
        })
    }
  });
  //! defines the service dependencies for the application
  const serviceDependencies = runtimeDependencies.chain({
    OrganizationService: {
      lifetime: Lifetime.Scoped,
      type: BaseOrganizationService<SchemaValidator, typeof OrganizationStatus>,
      factory: ({ EntityManager, OpenTelemetryCollector }, resolve, context) =>
        new BaseOrganizationService(
          context.entityManagerOptions
            ? resolve('EntityManager', context)
            : EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            OrganizationDtoMapper,
            CreateOrganizationDtoMapper,
            UpdateOrganizationDtoMapper
          }
        )
    },
    PermissionService: {
      lifetime: Lifetime.Scoped,
      type: BasePermissionService<SchemaValidator>,
      factory: ({ EntityManager, OpenTelemetryCollector }, resolve, context) =>
        new BasePermissionService(
          context.entityManagerOptions
            ? resolve('EntityManager', context)
            : EntityManager,
          () => resolve('RoleService', context),
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            PermissionDtoMapper,
            CreatePermissionDtoMapper,
            UpdatePermissionDtoMapper,
            RoleEntityMapper
          }
        )
    },
    RoleService: {
      lifetime: Lifetime.Scoped,
      type: BaseRoleService<SchemaValidator>,
      factory: ({ EntityManager, OpenTelemetryCollector }, resolve, context) =>
        new BaseRoleService(
          context.entityManagerOptions
            ? resolve('EntityManager', context)
            : EntityManager,
          OpenTelemetryCollector,
          SchemaValidator(),
          {
            RoleDtoMapper,
            CreateRoleDtoMapper,
            UpdateRoleDtoMapper
          }
        )
    },
    UserService: {
      lifetime: Lifetime.Scoped,
      type: BaseUserService<SchemaValidator, typeof OrganizationStatus>,
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
            UserDtoMapper,
            CreateUserDtoMapper,
            UpdateUserDtoMapper
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
