import {
  number,
  optional,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import {
  BaseOrganizationService,
  BaseOrganizationServiceSchemas,
  BasePermissionService,
  BasePermissionServiceSchemas,
  BaseRoleService,
  BaseRoleServiceSchemas,
  BaseUserService,
  BaseUserServiceSchemas
} from '@forklaunch/blueprint-iam-implementation-base';
import { metrics } from '@forklaunch/blueprint-monitoring';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  createConfigInjector,
  DependencyShapes,
  getEnvVar,
  Lifetime
} from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import {
  CreateOrganizationDtoMapper,
  OrganizationDtoMapper,
  UpdateOrganizationDtoMapper
} from './models/dtoMapper/organization.dtoMapper';
import {
  CreatePermissionDtoMapper,
  PermissionDtoMapper,
  UpdatePermissionDtoMapper
} from './models/dtoMapper/permission.dtoMapper';
import {
  CreateRoleDtoMapper,
  RoleDtoMapper,
  RoleEntityMapper,
  UpdateRoleDtoMapper
} from './models/dtoMapper/role.dtoMapper';
import {
  CreateUserDtoMapper,
  UpdateUserDtoMapper,
  UserDtoMapper
} from './models/dtoMapper/user.dtoMapper';
import { OrganizationStatus } from './models/enum/organizationStatus.enum';

export const OrganizationSchemas = BaseOrganizationServiceSchemas(
  SchemaValidator(),
  true
);
export const PermissionSchemas = BasePermissionServiceSchemas(
  SchemaValidator(),
  true
);
export const RoleSchemas = BaseRoleServiceSchemas(SchemaValidator(), true);
export const UserSchemas = BaseUserServiceSchemas(SchemaValidator(), true);

//! defines the configuration schema for the application
export function createDepenencies({ orm }: { orm: MikroORM }) {
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
    EntityManager: {
      lifetime: Lifetime.Scoped,
      type: EntityManager,
      factory: (_args, _resolve, context) =>
        orm.em.fork(context?.entityManagerOptions as ForkOptions | undefined)
    }
  });

  const runtimeDependencies = environmentConfig.chain({
    OpenTelemetryCollector: {
      lifetime: Lifetime.Singleton,
      type: OpenTelemetryCollector,
      factory: ({ OTEL_SERVICE_NAME, OTEL_LEVEL }) =>
        new OpenTelemetryCollector(
          OTEL_SERVICE_NAME,
          OTEL_LEVEL || 'info',
          metrics
        )
    }
  });

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
            RoleDtoMapper: RoleEntityMapper
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

  return {
    environmentConfig,
    runtimeDependencies,
    serviceDependencies,
    tokens: serviceDependencies.tokens()
  };
}

export type ServiceDependencies = DependencyShapes<typeof createDepenencies>;
