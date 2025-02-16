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
//! bootstrap function that initializes the service application
bootstrap((ci) => {
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress();
  //! resolves the host, port, and version from the configuration
  const host = ci.resolve('host');
  const port = ci.resolve('port');
  const version = ci.resolve('version');
  const swaggerPath = ci.resolve('swaggerPath');
  //! resolves the necessary services from the configuration
  const scopedOrganizationServiceFactory = ci.scopedResolver(
    'organizationService'
  );
  const scopedPermissionServiceFactory = ci.scopedResolver('permissionService');
  const scopedRoleServiceFactory = ci.scopedResolver('roleService');
  const scopedUserServiceFactory = ci.scopedResolver('userService');
  //! constructs the routes using the appropriate controllers
  const organizationRoutes = OrganizationRoutes(
    new OrganizationController(scopedOrganizationServiceFactory)
  );
  const permissionRoutes = PermissionRoutes(
    new PermissionController(scopedPermissionServiceFactory)
  );
  const roleRoutes = RoleRoutes(new RoleController(scopedRoleServiceFactory));
  const userRoutes = UserRoutes(new UserController(scopedUserServiceFactory));
  //! mounts the routes to the app
  app.use(organizationRoutes.router);
  app.use(permissionRoutes.router);
  app.use(roleRoutes.router);
  app.use(userRoutes.router);
  //! starts the server
  app.listen(port, host, () => {
    console.log(
      `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api${version}${swaggerPath}`
    );
  });
});
//! defines the ApiClient for use with the UniversalSDK client
export type IamApiClient = ApiClient<{
  organization: typeof OrganizationRoutes;
  role: typeof RoleRoutes;
  permission: typeof PermissionRoutes;
  user: typeof UserRoutes;
}>;
