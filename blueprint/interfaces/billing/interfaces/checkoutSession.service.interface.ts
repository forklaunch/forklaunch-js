import { IdDto, RecordTimingDto } from '@forklaunch/common';

export type CreateCheckoutSessionDto<PaymentMethodEnum> = {
  customerId: string;
  paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
  metadata?: unknown;
  successRedirectUri: string;
  cancelRedirectUri: string;
  extraFields?: unknown;
};
export type UpdateCheckoutSessionDto<PaymentMethodEnum> = IdDto &
  Partial<CreateCheckoutSessionDto<PaymentMethodEnum>>;
export type CheckoutSessionDto<PaymentMethodEnum> = IdDto &
  CreateCheckoutSessionDto<PaymentMethodEnum> &
  Partial<RecordTimingDto>;

export type CheckoutSessionServiceParameters<PaymentMethodEnum> = {
  CreateCheckoutSessionDto: CreateCheckoutSessionDto<PaymentMethodEnum>;
  CheckoutSessionDto: CheckoutSessionDto<PaymentMethodEnum>;
  IdDto: IdDto;
};

export interface CheckoutSessionService<
  PaymentMethodEnum,
  Params extends
    CheckoutSessionServiceParameters<PaymentMethodEnum> = CheckoutSessionServiceParameters<PaymentMethodEnum>
> {
  // for generating external links
  // store in cache, for permissions
  createCheckoutSession: (
    checkoutSessionDto: Params['CreateCheckoutSessionDto']
  ) => Promise<Params['CheckoutSessionDto']>;
  getCheckoutSession: (
    idDto: Params['IdDto']
  ) => Promise<Params['CheckoutSessionDto']>;
  expireCheckoutSession: (idDto: Params['IdDto']) => Promise<void>;

  handleCheckoutSuccess: (idDto: Params['IdDto']) => Promise<void>;
  handleCheckoutFailure: (idDto: Params['IdDto']) => Promise<void>;
}
