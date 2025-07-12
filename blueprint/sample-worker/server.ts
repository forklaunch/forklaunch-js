import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { SdkClient } from '@forklaunch/core/http';
import { SampleWorkerRoutes } from './api/routes/sampleWorker.routes';
import { bootstrap } from './bootstrapper';
//! bootstrap resources and config
bootstrap((ci, tokens) => {
  //! resolves the openTelemetryCollector from the configuration
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
  const sampleWorkerServiceFactory = ci.scopedResolver(
    tokens.SampleWorkerService
  );
  //! constructs the necessary routes using the appropriate Routes functions
  const sampleWorkerRoutes = SampleWorkerRoutes(
    () => ci.createScope(),
    sampleWorkerServiceFactory,
    openTelemetryCollector
  );
  //! mounts the routes to the app
  app.use(sampleWorkerRoutes);
  //! starts the server
  app.listen(port, host, () => {
    openTelemetryCollector.info(
      `🎉 SampleWorker Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
    );
  });
});
//! defines the SdkClient for use with the UniversalSDK client
export type SampleWorkerSdkClient = SdkClient<{
  routes: typeof SampleWorkerRoutes;
}>;
