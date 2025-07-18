import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import dotenv from 'dotenv';
import { OrganizationRoutes } from './api/routes/organization.routes';
import { PermissionRoutes } from './api/routes/permission.routes';
import { RoleRoutes } from './api/routes/role.routes';
import { UserRoutes } from './api/routes/user.routes';
import { createDependencies } from './registrations';
//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
const { serviceDependencies, tokens } = createDependencies();
const ci = serviceDependencies.validateConfigSingletons(envFilePath);
//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
//! creates an instance of forklaunchExpress
const app = forklaunchExpress(SchemaValidator(), openTelemetryCollector);
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
export const organizationRoutes = OrganizationRoutes(
  organizationServiceFactory,
  openTelemetryCollector
);
export const permissionRoutes = PermissionRoutes(
  permissionServiceFactory,
  openTelemetryCollector
);
export const roleRoutes = RoleRoutes(
  roleServiceFactory,
  openTelemetryCollector
);
export const userRoutes = UserRoutes(
  userServiceFactory,
  openTelemetryCollector
);
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
