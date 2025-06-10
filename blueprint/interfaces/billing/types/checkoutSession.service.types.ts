import { IdDto, RecordTimingDto } from '@forklaunch/common';

export type CreateCheckoutSessionDto<PaymentMethodEnum, StatusEnum> = {
  customerId: string;
  paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
  metadata?: unknown;
  successRedirectUri: string;
  cancelRedirectUri: string;
  expiresAt: Date;
  status: StatusEnum[keyof StatusEnum];
  extraFields?: unknown;
};
export type UpdateCheckoutSessionDto<PaymentMethodEnum, StatusEnum> = IdDto &
  Partial<CreateCheckoutSessionDto<PaymentMethodEnum, StatusEnum>>;
export type CheckoutSessionDto<PaymentMethodEnum, StatusEnum> = IdDto &
  CreateCheckoutSessionDto<PaymentMethodEnum, StatusEnum> &
  Partial<RecordTimingDto>;

export type CheckoutSessionServiceParameters<PaymentMethodEnum, StatusEnum> = {
  CreateCheckoutSessionDto: CreateCheckoutSessionDto<
    PaymentMethodEnum,
    StatusEnum
  >;
  CheckoutSessionDto: CheckoutSessionDto<PaymentMethodEnum, StatusEnum>;
  IdDto: IdDto;
};
