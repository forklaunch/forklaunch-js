import { IdDto, RecordTimingDto } from '@forklaunch/common';

export type CreateCheckoutSessionDto<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = Partial<IdDto> & {
  customerId: string;
  paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
  currency: CurrencyEnum[keyof CurrencyEnum];
  successRedirectUri?: string;
  cancelRedirectUri?: string;
  expiresAt: Date;
  status: StatusEnum[keyof StatusEnum];
  providerFields?: unknown;
};
export type UpdateCheckoutSessionDto<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = Partial<
  CreateCheckoutSessionDto<PaymentMethodEnum, CurrencyEnum, StatusEnum>
> &
  IdDto;
export type CheckoutSessionDto<PaymentMethodEnum, CurrencyEnum, StatusEnum> =
  CreateCheckoutSessionDto<PaymentMethodEnum, CurrencyEnum, StatusEnum> &
    IdDto &
    Partial<RecordTimingDto>;

export type CheckoutSessionServiceParameters<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = {
  CreateCheckoutSessionDto: CreateCheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  CheckoutSessionDto: CheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  IdDto: IdDto;
};
