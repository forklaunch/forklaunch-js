import { ConfigInjector, Lifetime } from '@forklaunch/core/services';
import {
  Connection,
  EntityManager,
  ForkOptions,
  IDatabaseDriver,
  MikroORM
} from '@mikro-orm/core';
import { SchemaValidator } from 'core';
import mikroOrmOptionsConfig from './mikro-orm.config';
import BaseOrganizationService from './services/organization.service';
import BasePermissionService from './services/permission.service';
import BaseRoleService from './services/role.service';
import BaseUserService from './services/user.service';

const configValidator = {
  _orm: MikroORM<
    IDatabaseDriver<Connection>,
    EntityManager<IDatabaseDriver<Connection>>
  >,
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
        _orm: {
          lifetime: Lifetime.Singleton,
          value: orm
        },
        entityManager: {
          lifetime: Lifetime.Scoped,
          factory: ({ _orm }, _resolve, context) =>
            _orm.em.fork(
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
    callback(configInjector);
  });
}
