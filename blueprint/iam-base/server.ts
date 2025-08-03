import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import { sdkClient } from '@forklaunch/core/http';
import dotenv from 'dotenv';
import {
  organizationSdkRouter,
  organiztionRouter
} from './api/routes/organization.routes';
import {
  permissionRouter,
  permissionSdkRouter
} from './api/routes/permission.routes';
import { roleRouter, roleSdkRouter } from './api/routes/role.routes';
import { userRouter, userSdkRouter } from './api/routes/user.routes';
import { createDependencies } from './registrations';
//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
export const { ci, tokens } = createDependencies(envFilePath);
const schemaValidator = SchemaValidator();
//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
//! creates an instance of forklaunchExpress
const app = forklaunchExpress(schemaValidator, openTelemetryCollector);
//! resolves the host, port, and version from the configuration
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);
//! mounts the routes to the app
app.use(organiztionRouter);
app.use(permissionRouter);
app.use(roleRouter);
app.use(userRouter);
//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 IAM Server is running at http://${host}:${port} 🎉.\nAn API reference can be accessed at http://${host}:${port}/api/${version}${docsPath}`
  );
});
export const iamSdk = sdkClient(schemaValidator, {
  organization: organizationSdkRouter,
  permission: permissionSdkRouter,
  role: roleSdkRouter,
  user: userSdkRouter
});
