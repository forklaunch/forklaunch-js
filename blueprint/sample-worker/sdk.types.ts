/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  SdkClient,
  UnpackSdkClientInput,
  ValidSdkClientInput
} from '@forklaunch/core/http';
import { sampleWorkerRoutes } from './server';

type SampleWorkerSdkClientInput = {
  sampleWorker: typeof sampleWorkerRoutes;
};

type UnpackedSampleWorkerSdkClientInput =
  UnpackSdkClientInput<SampleWorkerSdkClientInput>;

type ValidatedSampleWorkerSdkClientInput =
  ValidSdkClientInput<UnpackedSampleWorkerSdkClientInput>;

export type SampleWorkerSdkClient = SdkClient<SampleWorkerSdkClientInput>;
