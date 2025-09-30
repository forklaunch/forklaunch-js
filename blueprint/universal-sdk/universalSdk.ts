import { BillingSdkClient } from '@forklaunch/blueprint-billing-base';
import { BillingSdkClient as BillingStripeSdkClient } from '@forklaunch/blueprint-billing-stripe';
import { IamSdkClient } from '@forklaunch/blueprint-iam-base';
import {
  BetterAuthConfig,
  IamSdkClient as IamBetterAuthSdkClient
} from '@forklaunch/blueprint-iam-better-auth';
import { SampleWorkerSdkClient } from '@forklaunch/blueprint-sample-worker';
import { RegistryOptions, universalSdk } from '@forklaunch/universal-sdk';
import { createAuthClient } from 'better-auth/client';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const billingSdkClient = universalSdk<BillingSdkClient>;
export const billingStripeSdkClient = universalSdk<BillingStripeSdkClient>;
export const iamSdkClient = universalSdk<IamSdkClient>;
export const iamBetterAuthSdkClient = async ({
  host,
  registryOptions
}: {
  host: string;
  registryOptions: RegistryOptions;
}) => ({
  core: await universalSdk<IamBetterAuthSdkClient>({
    host,
    registryOptions: registryOptions
  }),
  betterAuth: createAuthClient({
    baseURL: host,
    plugins: [inferAdditionalFields<BetterAuthConfig>()]
  })
});
export const sampleWorkerSdkClient = universalSdk<SampleWorkerSdkClient>;
