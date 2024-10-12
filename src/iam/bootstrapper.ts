import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import { SchemaValidator } from 'core';
import config from './mikro-orm.config';
import {
  default as BaseOrganizationService,
  default as OrganizationService
} from './services/organization.service';
import BasePermissionService from './services/permission.service';
import BaseRoleService from './services/role.service';
import BaseUserService from './services/user.service';

export function bootstrap() {
  const em = MikroORM.initSync(config).em;

  return new ConfigInjector(
    SchemaValidator(),
    {
      entityManager: EntityManager,
      organizationService: BaseOrganizationService,
      permissionService: BasePermissionService,
      roleService: BaseRoleService,
      userService: BaseUserService
    },
    {
      entityManager: {
        lifetime: Lifetime.Scoped,
        factory: (_args, _resolve, context) =>
          em.fork(context?.entityManagerOptions as ForkOptions | undefined)
      },
      organizationService: {
        lifetime: Lifetime.Scoped,
        factory: ({ entityManager }, resolve, context) => {
          let em = entityManager;
          if (context.entityManagerOptions) {
            em = resolve('entityManager', context);
          }
          return new OrganizationService(em);
        }
      },
      permissionService: {
        lifetime: Lifetime.Scoped,
        factory: ({ entityManager }, resolve, context) => {
          let em = entityManager;
          if (context.entityManagerOptions) {
            em = resolve('entityManager', context);
          }
          return new BasePermissionService(em);
        }
      },
      roleService: {
        lifetime: Lifetime.Scoped,
        factory: ({ entityManager }, resolve, context) => {
          let em = entityManager;
          if (context.entityManagerOptions) {
            em = resolve('entityManager', context);
          }
          return new BaseRoleService(em);
        }
      },
      userService: {
        lifetime: Lifetime.Scoped,
        factory: ({ entityManager }, resolve, context) => {
          let em = entityManager;
          if (context.entityManagerOptions) {
            em = resolve('entityManager', context);
          }
          return new BaseUserService(em);
        }
      }
    }
  );
}
