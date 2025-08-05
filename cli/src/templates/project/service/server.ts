import { forklaunchExpress, SchemaValidator } from '@{{app_name}}/core';
import { {{camel_case_name}}Router } from './api/routes/{{camel_case_name}}.routes';
import { ci, tokens } from './bootstrapper';

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
