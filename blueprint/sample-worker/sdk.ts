import { SchemaValidator } from '@forklaunch/blueprint-core';
import { MapToSdk } from '@forklaunch/core/http';
import { sampleWorkerGet, sampleWorkerPost } from './api/controllers';

export type SampleWorkerSdk = {
  sampleWorker: {
    sampleWorkerGet: typeof sampleWorkerGet;
    sampleWorkerPost: typeof sampleWorkerPost;
  };
};

export const sampleWorkerSdkClient = {
  sampleWorker: {
    sampleWorkerGet: sampleWorkerGet,
    sampleWorkerPost: sampleWorkerPost
  }
} satisfies SampleWorkerSdk;

export type SampleWorkerSdkClient = MapToSdk<SchemaValidator, SampleWorkerSdk>;
