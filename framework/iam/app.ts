import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/framework-core';
import { bootstrap } from './bootstrapper';
import { OrganizationController } from './controllers/organization.controller';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserController } from './controllers/user.controller';
import { OrganizationRoutes } from './routes/organization.routes';
import { PermissionRoutes } from './routes/permission.routes';
import { RoleRoutes } from './routes/role.routes';
import { UserRoutes } from './routes/user.routes';

bootstrap((ci) => {
  const app = forklaunchExpress();
  const host = ci.resolve('host');
  const port = ci.resolve('port');
  const version = ci.resolve('version');
  const swaggerPath = ci.resolve('swaggerPath');

  const organizationRoutes = OrganizationRoutes(
    new OrganizationController(ci.scopedResolver('organizationService'))
  );
  const permissionRoutes = PermissionRoutes(
    new PermissionController(ci.scopedResolver('permissionService'))
  );
  const roleRoutes = RoleRoutes(
    new RoleController(ci.scopedResolver('roleService'))
  );
  const userRoutes = UserRoutes(
    new UserController(ci.scopedResolver('userService'))
  );

  app.use(organizationRoutes.router);
  app.use(permissionRoutes.router);
  app.use(roleRoutes.router);
  app.use(userRoutes.router);

  app.listen(port, host, () => {
    console.log(
      `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api${version}${swaggerPath}`
    );
  });
});

export type IamApiClient = ApiClient<{
  organization: typeof OrganizationRoutes;
  role: typeof RoleRoutes;
  permission: typeof PermissionRoutes;
  user: typeof UserRoutes;
}>;
