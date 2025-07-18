import { forklaunchExpress, SchemaValidator } from '@{{app_name}}/core';
import { getEnvVar } from '@forklaunch/common';
import dotenv from 'dotenv';
import { {{pascal_case_name}}Routes } from './api/routes/{{camel_case_name}}.routes';
import { createDependencies } from './registrations';
//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });
const { serviceDependencies, tokens } = createDependencies();
const ci = serviceDependencies.validateConfigSingletons(envFilePath);
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
//! resolves the necessary services from the configuration
const scoped{{pascal_case_name}}ServiceFactory = ci.scopedResolver(tokens.{{pascal_case_name}}Service);
//! constructs the necessary routes using the appropriate Routes functions
export const {{camel_case_name}}Routes = {{pascal_case_name}}Routes(
  () => ci.createScope(),
  scoped{{pascal_case_name}}ServiceFactory,
  openTelemetryCollector
);
//! mounts the routes to the app
app.use({{camel_case_name}}Routes);
//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 {{pascal_case_name}} Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
  );
});
