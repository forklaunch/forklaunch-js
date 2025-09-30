import { forklaunchExpress, schemaValidator } from '@forklaunch/blueprint-core';
import {
  betterAuthTelemetryHookMiddleware,
  enrichBetterAuthApi
} from './api/middlewares/betterAuth.middleware';
import { organizationRouter } from './api/routes/organization.routes';
import { permissionRouter } from './api/routes/permission.routes';
import { roleRouter } from './api/routes/role.routes';
import { userRouter } from './api/routes/user.routes';
import { BetterAuth } from './auth';
import { ci, tokens } from './bootstrapper';
import { iamSdkClient } from './sdk';

//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

//! creates an instance of forklaunchExpress
const app = forklaunchExpress(
  schemaValidator,
  openTelemetryCollector,
  await ci.resolve(tokens.ExpressApplicationOptions)
);

//! registers the betterAuth middleware
app.internal.all(
  '/api/auth/{*any}',
  betterAuthTelemetryHookMiddleware,
  enrichBetterAuthApi(ci.resolve(tokens.BetterAuth) as BetterAuth)
);

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

//! register the sdk client
app.registerSdks(iamSdkClient);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
  );
});
