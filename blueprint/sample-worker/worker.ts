import { ApiClient } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/blueprint-core';
import { bootstrap } from './bootstrapper';
import { SampleWorkerRoutes } from './routes/sampleWorker.routes';
//! bootstrap function that initializes the service application
bootstrap((ci, tokens) => {
  //! resolves the openTelemetryCollector from the configuration
  const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);
  //! creates an instance of forklaunchExpress
  const app = forklaunchExpress(openTelemetryCollector);
  //! resolves the protocol, host, port, and version from the configuration
  const protocol = ci.resolve(tokens.PROTOCOL);
  const host = ci.resolve(tokens.HOST);
  const port = ci.resolve(tokens.PORT);
  const version = ci.resolve(tokens.VERSION);
  const docsPath = ci.resolve(tokens.DOCS_PATH);
  //! resolves the necessary services from the configuration
  const scopedSampleWorkerServiceFactory = ci.scopedResolver(
    tokens.SampleWorkerService
  );
  //! constructs the necessary routes using the appropriate Routes functions
  const sampleWorkerRoutes = SampleWorkerRoutes(
    () => ci.createScope(),
    scopedSampleWorkerServiceFactory,
    openTelemetryCollector
  );
  //! mounts the routes to the app
  app.use(sampleWorkerRoutes.router);
  //! starts the server
  app.listen(port, host, () => {
    openTelemetryCollector.info(
      `🎉 SampleWorker Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
    );
  });
});
//! defines the ApiClient for use with the UniversalSDK client
export type SampleWorkerApiClient = ApiClient<{
  sampleWorker: typeof SampleWorkerRoutes;
}>;
