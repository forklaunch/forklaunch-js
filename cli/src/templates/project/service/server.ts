import { forklaunchExpress, {{#is_iam_configured}}PERMISSIONS, ROLES, {{/is_iam_configured}}SchemaValidator } from '@{{app_name}}/core';
import { {{camel_case_name}}Router } from './api/routes/{{camel_case_name}}.routes';
import { ci, tokens } from './bootstrapper';
import { {{camel_case_name}}SdkClient } from './sdk';

/**
 * Creates an instance of OpenTelemetryCollector
 */
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

/**
 * Creates an instance of forklaunchExpress
 */

const app = forklaunchExpress(SchemaValidator(), openTelemetryCollector, {{#is_iam_configured}}{
  auth: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    surfacePermissions: async (_payload, _req) => {
      //! return the permissions for the user, this is a placeholder
      return new Set([PERMISSIONS.PLATFORM_READ]);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    surfaceRoles: async (_payload, _req) => {
      //! return the roles for the user, this is a placeholder
      return new Set([ROLES.ADMIN]);
    }
  }
}{{/is_iam_configured}});

//! resolves the protocol, host, port, and version from the configuration
const protocol = ci.resolve(tokens.PROTOCOL);
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);

//! mounts the routes to the app
app.use({{camel_case_name}}Router);

//! mounts the sdk to the app
app.registerSdks({{camel_case_name}}SdkClient);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 {{pascal_case_name}} Server is running at ${protocol}://${host}:${port} 🎉.
    // An API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
  );
});
