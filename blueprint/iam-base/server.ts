import { forklaunchExpress, schemaValidator } from '@forklaunch/blueprint-core';
import { organizationRouter } from './api/routes/organization.routes';
import { permissionRouter } from './api/routes/permission.routes';
import { roleRouter } from './api/routes/role.routes';
import { userRouter } from './api/routes/user.routes';
import { ci, tokens } from './bootstrapper';

//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
const userService = ci.resolve(tokens.UserService);

//! creates an instance of forklaunchExpress
const app = forklaunchExpress(schemaValidator, openTelemetryCollector, {
  auth: {
    surfacePermissions: async (payload) => {
      if (!payload.sub) {
        return new Set();
      }
      return new Set(
        (
          await userService.surfacePermissions({
            id: payload.sub
          })
        ).map((permission) => permission.slug)
      );
    },
    surfaceRoles: async (payload) => {
      if (!payload.sub) {
        return new Set();
      }
      return new Set(
        (
          await userService.surfaceRoles({
            id: payload.sub
          })
        ).map((role) => role.name)
      );
    }
  }
});

//! resolves the host, port, and version from the configuration
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);

//! mounts the routes to the app
app.use(organizationRouter);
app.use(permissionRouter);
app.use(roleRouter);
app.use(userRouter);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 IAM Server is running at http://${host}:${port} 🎉.
    // An API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
  );
});
