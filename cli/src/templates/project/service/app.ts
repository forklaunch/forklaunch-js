import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@{{app_name}}/core';
import { bootstrap } from './bootstrapper';
import { HelloForklaunchController } from './controllers/helloForklaunch.controller';
import { HelloForklaunchRoutes } from './routes/helloForklaunch.routes';

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

  // resolves the helloForklaunchService from the configuration
  const scopedHelloForklaunchServiceFactory = ci.scopedResolver('helloForklaunchService');

  // constructs the helloForklaunchRoutes using the HelloForklaunchRoutes function
  const helloForklaunchRoutes = HelloForklaunchRoutes(
    new HelloForklaunchController(
      () => ci.createScope(),
      scopedHelloForklaunchServiceFactory
    )
  );

  // mounts the helloForklaunchRoutes to the app
  app.use(helloForklaunchRoutes.router);

  // starts the server
  app.listen(port ?? 8000, host ?? 'localhost', () => {
    console.log(
      `🎉 Hello Forklaunch Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api${version}${swaggerPath}`
    );
  });
});

// ForklaunchApiClient type that defines the API client with the helloForklaunch routes, for shared types across the monorepo
export type ForklaunchApiClient = ApiClient<{
  helloForklaunch: typeof HelloForklaunchRoutes;
}>;
