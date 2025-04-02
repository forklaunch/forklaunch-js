import { forklaunchExpress } from '@forklaunch/blueprint-core';
import { ApiClient } from '@forklaunch/core/http';
import { bootstrap } from './bootstrapper';
import { OrganizationRoutes } from './routes/organization.routes';
import { PermissionRoutes } from './routes/permission.routes';
import { RoleRoutes } from './routes/role.routes';
import { UserRoutes } from './routes/user.routes';
//! bootstrap function that initializes the service application
bootstrap((ci, tokens) => {
  //! resolves the openTelemetryCollector from the configuration
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress(openTelemetryCollector);
  //! resolves the host, port, and version from the configuration
  const host = ci.resolve(tokens.HOST);
  const port = ci.resolve(tokens.PORT);
  const version = ci.resolve(tokens.VERSION);
  const docsPath = ci.resolve(tokens.DOCS_PATH);
  //! resolves the necessary services from the configuration
  const scopedOrganizationServiceFactory = ci.scopedResolver(
    tokens.OrganizationService
  );
  const scopedPermissionServiceFactory = ci.scopedResolver(
    tokens.PermissionService
  );
  const scopedRoleServiceFactory = ci.scopedResolver(tokens.RoleService);
  const scopedUserServiceFactory = ci.scopedResolver(tokens.UserService);
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
