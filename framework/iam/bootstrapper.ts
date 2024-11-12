import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager, ForkOptions, MikroORM } from '@mikro-orm/core';
import mikroOrmOptionsConfig from './mikro-orm.config';
import BaseOrganizationService from './services/organization.service';
import BasePermissionService from './services/permission.service';
import BaseRoleService from './services/role.service';
import BaseUserService from './services/user.service';

const configValidator = {
  entityManager: EntityManager,
  organizationService: BaseOrganizationService,
  permissionService: BasePermissionService,
  roleService: BaseRoleService,
  userService: BaseUserService
};

export function bootstrap(
  callback: (
    ci: ConfigInjector<SchemaValidator, typeof configValidator>
  ) => void
) {
  MikroORM.init(mikroOrmOptionsConfig).then((orm) => {
    const configInjector = new ConfigInjector(
      SchemaValidator(),
      configValidator,
      {
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
          factory: ({ entityManager }, resolve, context) => {
            let em = entityManager;
            if (context.entityManagerOptions) {
              em = resolve('entityManager', context);
            }
            return new BaseUserService(
              em,
              () => resolve('roleService', context),
              () => resolve('organizationService', context)
            );
          }
        }
      }
    );
    callback(configInjector);
  });
}
