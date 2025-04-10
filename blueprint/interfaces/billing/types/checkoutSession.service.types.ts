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
