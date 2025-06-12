import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { ApiClient } from '@forklaunch/core/http';
import {
  betterAuthTelemetryHookMiddleware,
  enrichBetterAuthApi
} from './api/middlewares/betterAuth.middleware';
import { OrganizationRoutes } from './api/routes/organization.routes';
import { PermissionRoutes } from './api/routes/permission.routes';
import { RoleRoutes } from './api/routes/role.routes';
import { UserRoutes } from './api/routes/user.routes';
import { bootstrap } from './bootstrapper';
//! bootstrap function that initializes the service application
bootstrap(async (ci, tokens) => {
  //! resolves the openTelemetryCollector from the configuration
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress(
    SchemaValidator(),
    openTelemetryCollector,
    await ci.resolve(tokens.ExpressOptions)
  );
  //! registers the betterAuth middleware
  app.internal.all(
    '/api/auth/{*any}',
    betterAuthTelemetryHookMiddleware,
    enrichBetterAuthApi(ci.resolve(tokens.BetterAuth))
  );
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
