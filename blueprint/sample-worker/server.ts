import { forklaunchExpress, SchemaValidator } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import { sdkClient } from '@forklaunch/core/http';
import dotenv from 'dotenv';
import {
  sampleWorkerRouter,
  sampleWorkerSdkRouter
} from './api/routes/sampleWorker.routes';
import { createDependencies } from './registrations';

//! bootstrap resources and config
const envFilePath = getEnvVar('DOTENV_FILE_PATH');
dotenv.config({ path: envFilePath });

export const { ci, tokens } = createDependencies(envFilePath);

//! resolves the openTelemetryCollector from the configuration
const openTelemetryCollector = ci.resolve(tokens.OpenTelemetryCollector);

//! creates an instance of forklaunchExpress
const schemaValidator = SchemaValidator();
const app = forklaunchExpress(schemaValidator, openTelemetryCollector);

//! resolves the protocol, host, port, and version from the configuration
const protocol = ci.resolve(tokens.PROTOCOL);
const host = ci.resolve(tokens.HOST);
const port = ci.resolve(tokens.PORT);
const version = ci.resolve(tokens.VERSION);
const docsPath = ci.resolve(tokens.DOCS_PATH);

//! mounts the routes to the app
app.use(sampleWorkerRouter);

//! starts the server
app.listen(port, host, () => {
  openTelemetryCollector.info(
    `🎉 SampleWorker Server is running at ${protocol}://${host}:${port} 🎉.\nAn API reference can be accessed at ${protocol}://${host}:${port}/api/${version}${docsPath}`
  );
});

//! exports the SDK for client usage
export const sampleWorkerSdk = sdkClient(schemaValidator, {
  sampleWorker: sampleWorkerSdkRouter
});
