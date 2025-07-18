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
  subscriptionRoutes,
  webhookRoutes
} from './server';

type BillingSdkClientInput = {
  checkoutSession: typeof checkoutSessionRoutes;
  paymentLink: typeof paymentLinkRoutes;
  plan: typeof planRoutes;
  subscription: typeof subscriptionRoutes;
  webhook: typeof webhookRoutes;
};

type UnpackedBillingSdkClientInput =
  UnpackSdkClientInput<BillingSdkClientInput>;

type ValidatedBillingSdkClientInput =
  ValidSdkClientInput<UnpackedBillingSdkClientInput>;

export type BillingSdkClient = SdkClient<BillingSdkClientInput>;
