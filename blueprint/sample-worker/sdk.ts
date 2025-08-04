import { schemaValidator } from '@forklaunch/blueprint-core';
import { sdkClient } from '@forklaunch/core/http';
import { sampleWorkerSdkRouter } from './api/routes/sampleWorker.routes';

//! creates an instance of the sdkClient
export const SampleWorkerSdk = sdkClient(schemaValidator, {
  sampleWorker: sampleWorkerSdkRouter
});
