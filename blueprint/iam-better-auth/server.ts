import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { SdkClient } from '@forklaunch/core/http';
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
  const organizationServiceFactory = ci.scopedResolver(
    tokens.OrganizationService
  );
  const permissionServiceFactory = ci.scopedResolver(tokens.PermissionService);
  const roleServiceFactory = ci.scopedResolver(tokens.RoleService);
  const userServiceFactory = ci.scopedResolver(tokens.UserService);
  //! constructs the routes using the appropriate controllers
  const organizationRoutes = OrganizationRoutes(
    organizationServiceFactory,
    openTelemetryCollector
  );
  const permissionRoutes = PermissionRoutes(
    permissionServiceFactory,
    openTelemetryCollector
  );
  const roleRoutes = RoleRoutes(roleServiceFactory, openTelemetryCollector);
  const userRoutes = UserRoutes(userServiceFactory, openTelemetryCollector);
  //! mounts the routes to the app
  app.use(organizationRoutes);
  app.use(permissionRoutes);
  app.use(roleRoutes);
  app.use(userRoutes);
  //! starts the server
  app.listen(port, host, () => {
    openTelemetryCollector.info(
      `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
    );
  });
});
//! defines the SdkClient for use with the UniversalSDK client
export type IamSdkClient = SdkClient<
  [
    typeof OrganizationRoutes,
    typeof RoleRoutes,
    typeof PermissionRoutes,
    typeof UserRoutes
  ]
>;
