/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  SdkClient,
  UnpackSdkClientInput,
  ValidSdkClientInput
} from '@forklaunch/core/http';
import {
  checkoutSessionRoutes,
  paymentLinkRoutes,
  planRoutes,
  subscriptionRoutes
} from './server';

type BillingClientSdkInput = {
  checkoutSession: typeof checkoutSessionRoutes;
  paymentLink: typeof paymentLinkRoutes;
  plan: typeof planRoutes;
  subscription: typeof subscriptionRoutes;
};

type UnpackedBillingClientSdkInput =
  UnpackSdkClientInput<BillingClientSdkInput>;

type ValidatedBillingClientSdkInput =
  ValidSdkClientInput<UnpackedBillingClientSdkInput>;

export type BillingSdkClient = SdkClient<BillingClientSdkInput>;
