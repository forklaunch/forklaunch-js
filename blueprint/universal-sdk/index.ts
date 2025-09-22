import { BillingSdk } from '@forklaunch/blueprint-billing-base';
import { BillingSdk as BillingStripeSdk } from '@forklaunch/blueprint-billing-stripe/serialized';
import { SchemaValidator } from '@forklaunch/blueprint-core';
import { IamSdk } from '@forklaunch/blueprint-iam-base/serialized';
import { IamSdk as IamBetterAuthSdk } from '@forklaunch/blueprint-iam-better-auth/serialized';
import { SampleWorkerSdk } from '@forklaunch/blueprint-sample-worker/serialized';
import { MapToSdk } from '@forklaunch/core/http';
import { RegistryOptions, universalSdk } from '@forklaunch/universal-sdk';
import { createAuthClient } from 'better-auth/client';

export type BillingSdkClient = MapToSdk<SchemaValidator, BillingSdk>;
export type BillingStripeSdkClient = MapToSdk<
  SchemaValidator,
  BillingStripeSdk
>;
export type IamSdkClient = MapToSdk<SchemaValidator, IamSdk>;
export type IamBetterAuthSdkClient = MapToSdk<
  SchemaValidator,
  IamBetterAuthSdk
>;
export type SampleWorkerSdkClient = MapToSdk<SchemaValidator, SampleWorkerSdk>;

export const billingSdkClient = async ({
  host,
  registryOptions
}: {
  host: string;
  registryOptions?: RegistryOptions;
}) =>
  await universalSdk<BillingSdkClient>({
    host,
    registryOptions: registryOptions || {
      path: 'api/v1/openapi'
    }
  });

export const billingStripeSdkClient = async ({
  host,
  registryOptions
}: {
  host: string;
  registryOptions?: RegistryOptions;
}) =>
  await universalSdk<BillingStripeSdkClient>({
    host,
    registryOptions: registryOptions || {
      path: 'api/v1/openapi'
    }
  });

export const iamSdkClient = async ({
  host,
  registryOptions
}: {
  host: string;
  registryOptions?: RegistryOptions;
}) =>
  await universalSdk<IamSdkClient>({
    host,
    registryOptions: registryOptions || {
      path: 'api/v1/openapi'
    }
  });

export const iamBetterAuthSdkClient: ({
  host,
  registryOptions
}: {
  host: string;
  registryOptions?: RegistryOptions;
}) => Promise<{
  core: IamBetterAuthSdkClient;
  betterAuth: ReturnType<typeof createAuthClient>;
}> = async ({
  host,
  registryOptions
}: {
  host: string;
  registryOptions?: RegistryOptions;
}) => ({
  core: await universalSdk<IamBetterAuthSdkClient>({
    host,
    registryOptions: registryOptions || {
      path: 'api/v1/openapi'
    }
  }),
  betterAuth: createAuthClient({
    baseURL: host
  })
});

export const sampleWorkerSdkClient = async ({
  host,
  registryOptions
}: {
  host: string;
  registryOptions?: RegistryOptions;
}) =>
  await universalSdk<SampleWorkerSdkClient>({
    host,
    registryOptions: registryOptions || {
      path: 'api/v1/openapi'
    }
  });
