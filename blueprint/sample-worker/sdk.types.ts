/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  SdkClient,
  UnpackSdkClientInput,
  ValidSdkClientInput
} from '@forklaunch/core/http';
import { sampleWorkerRoutes } from './server';

type SampleWorkerClientSdkInput = {
  sampleWorker: typeof sampleWorkerRoutes;
};

type UnpackedSampleWorkerClientSdkInput =
  UnpackSdkClientInput<SampleWorkerClientSdkInput>;

type ValidatedSampleWorkerClientSdkInput =
  ValidSdkClientInput<UnpackedSampleWorkerClientSdkInput>;

export type SampleWorkerSdkClient = SdkClient<SampleWorkerClientSdkInput>;
