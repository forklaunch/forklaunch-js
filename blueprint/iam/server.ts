import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/framework-core';
import { bootstrap } from './bootstrapper';
import { OrganizationRoutes } from './routes/organization.routes';
import { PermissionRoutes } from './routes/permission.routes';
import { RoleRoutes } from './routes/role.routes';
import { UserRoutes } from './routes/user.routes';
//! bootstrap function that initializes the service application
bootstrap((ci) => {
  //! resolves the openTelemetryCollector from the configuration
  const openTelemetryCollector = ci.resolve('openTelemetryCollector');
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress(openTelemetryCollector);
  //! resolves the host, port, and version from the configuration
  const host = ci.resolve('HOST');
  const port = ci.resolve('PORT');
  const version = ci.resolve('VERSION');
  const docsPath = ci.resolve('DOCS_PATH');
  //! resolves the necessary services from the configuration
  const scopedOrganizationServiceFactory = ci.scopedResolver(
    'organizationService'
  );
  const scopedPermissionServiceFactory = ci.scopedResolver('permissionService');
  const scopedRoleServiceFactory = ci.scopedResolver('roleService');
  const scopedUserServiceFactory = ci.scopedResolver('userService');
  //! constructs the routes using the appropriate controllers
  const organizationRoutes = OrganizationRoutes(
    scopedOrganizationServiceFactory,
    openTelemetryCollector
  );
  const permissionRoutes = PermissionRoutes(
    scopedPermissionServiceFactory,
    openTelemetryCollector
  );
  const roleRoutes = RoleRoutes(
    scopedRoleServiceFactory,
    openTelemetryCollector
  );
  const userRoutes = UserRoutes(
    scopedUserServiceFactory,
    openTelemetryCollector
  );
  //! mounts the routes to the app
  app.use(organizationRoutes.router);
  app.use(permissionRoutes.router);
  app.use(roleRoutes.router);
  app.use(userRoutes.router);
  //! starts the server
  app.listen(port, host, () => {
    openTelemetryCollector.info(
      `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
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
