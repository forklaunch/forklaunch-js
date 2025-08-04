import { forklaunchExpress, SchemaValidator } from '@{{app_name}}/core';
import { getEnvVar } from '@forklaunch/common';
import dotenv from 'dotenv';
import { {{camel_case_name}}Router } from './api/routes/{{camel_case_name}}.routes';
import { createDependencyContainer } from './registrations';

//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
export const { ci, tokens } = createDependencyContainer(envFilePath);
export type ScopeFactory = typeof ci.createScope;

//! creates an instance of forklaunchExpress
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

//! creates an instance of forklaunchExpress
const app = forklaunchExpress(SchemaValidator(), openTelemetryCollector);

//! resolves the protocol, host, port, and version from the configuration
const protocol = ci.resolve(tokens.PROTOCOL);
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);

//! mounts the routes to the app
app.use({{camel_case_name}}Router);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 {{pascal_case_name}} Server is running at ${protocol}://${host}:${port} 🎉.
    // An API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
  );
});
