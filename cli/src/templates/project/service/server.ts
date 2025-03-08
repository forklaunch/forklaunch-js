import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@{{app_name}}/core';
import { bootstrap } from './bootstrapper';
import { {{pascal_case_name}}Controller } from './controllers/{{camel_case_name}}.controller';
import { {{pascal_case_name}}Routes } from './routes/{{camel_case_name}}.routes';
//! bootstrap function that initializes the service application
bootstrap((ci) => {
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress();
  //! resolves the protocol, host, port, and version from the configuration
  const protocol = ci.resolve('protocol');
  const host = ci.resolve('host');
  const port = ci.resolve('port');
  const version = ci.resolve('version');
  const docsPath = ci.resolve('docsPath');
  //! resolves the necessary services from the configuration
  const scoped{{pascal_case_name}}ServiceFactory = ci.scopedResolver('{{camel_case_name}}Service');
  //! constructs the necessary routes using the appropriate Routes functions
  const {{camel_case_name}}Routes = {{pascal_case_name}}Routes(
    new {{pascal_case_name}}Controller(
      () => ci.createScope(),
      scoped{{pascal_case_name}}ServiceFactory,
      ci.resolve('openTelemetryCollector')
    )
  );
  //! mounts the routes to the app
  app.use({{camel_case_name}}Routes.router);
  //! starts the server
  app.listen(port, host, () => {
    console.log(
      `🎉 {{pascal_case_name}} Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
    );
  });
});
//! defines the ApiClient for use with the UniversalSDK client
export type {{pascal_case_name}}ApiClient = ApiClient<{
  {{camel_case_name}}: typeof {{pascal_case_name}}Routes;
}>;
