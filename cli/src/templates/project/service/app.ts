import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@{{app_name}}/core';
import { bootstrap } from './bootstrapper';
import { {{pascal_case_service_name}}Controller } from './controllers/{{camel_case_service_name}}.controller';
import { {{pascal_case_service_name}}Routes } from './routes/{{camel_case_service_name}}.routes';

// bootstrap function that initializes the application
bootstrap((ci) => {
  // creates an instance of forklaunchExpress
  const app = forklaunchExpress();

  // resolves the protocol, host, port, and version from the configuration
  const protocol = ci.resolve('protocol');
  const host = ci.resolve('host');
  const port = ci.resolve('port');
  const version = ci.resolve('version');
  const swaggerPath = ci.resolve('swaggerPath');

  // resolves the {{camel_case_service_name}}Service from the configuration
  const scoped{{pascal_case_service_name}}ServiceFactory = ci.scopedResolver('{{camel_case_service_name}}Service');

  // constructs the {{camel_case_service_name}}Routes using the {{pascal_case_service_name}}Routes function
  const {{camel_case_service_name}}Routes = {{pascal_case_service_name}}Routes(
    new {{pascal_case_service_name}}Controller(
      () => ci.createScope(),
      scoped{{pascal_case_service_name}}ServiceFactory
    )
  );

  // mounts the {{camel_case_service_name}}Routes to the app
  app.use({{camel_case_service_name}}Routes.router);

  // starts the server
  app.listen(port ?? 8000, host ?? 'localhost', () => {
    console.log(
      `🎉 Hello Forklaunch Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api${version}${swaggerPath}`
    );
  });
});

// ForklaunchApiClient type that defines the API client with the {{camel_case_service_name}} routes, for shared types across the monorepo
export type ForklaunchApiClient = ApiClient<{
  {{camel_case_service_name}}: typeof {{pascal_case_service_name}}Routes;
}>;
