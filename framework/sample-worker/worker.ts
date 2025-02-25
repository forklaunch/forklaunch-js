import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/framework-core';
import { bootstrap } from './bootstrapper';
import { SampleWorkerController } from './controllers/sampleWorker.controller';
import { SampleWorkerRoutes } from './routes/sampleWorker.routes';
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
  const scopedSampleWorkerServiceFactory = ci.scopedResolver(
    'sampleWorkerService'
  );
  //! constructs the necessary routes using the appropriate Routes functions
  const sampleWorkerRoutes = SampleWorkerRoutes(
    new SampleWorkerController(
      () => ci.createScope(),
      scopedSampleWorkerServiceFactory
    )
  );
  //! mounts the routes to the app
  app.use(sampleWorkerRoutes.router);
  //! starts the server
  app.listen(port, host, () => {
    console.log(
      `🎉 SampleWorker Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
    );
  });
});
//! defines the ApiClient for use with the UniversalSDK client
export type SampleWorkerApiClient = ApiClient<{
  sampleWorker: typeof SampleWorkerRoutes;
}>;
