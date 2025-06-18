import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreatePaymentLinkDto<PaymentMethodEnum, CurrencyEnum, StatusEnum> =
  Partial<IdDto> & {
    amount: number;
    currency: CurrencyEnum[keyof CurrencyEnum];
    paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
    status: StatusEnum[keyof StatusEnum];
    providerFields?: unknown;
  };
export type UpdatePaymentLinkDto<PaymentMethodEnum, CurrencyEnum, StatusEnum> =
  Partial<CreatePaymentLinkDto<PaymentMethodEnum, CurrencyEnum, StatusEnum>> &
    IdDto;
export type PaymentLinkDto<PaymentMethodEnum, CurrencyEnum, StatusEnum> =
  CreatePaymentLinkDto<PaymentMethodEnum, CurrencyEnum, StatusEnum> &
    IdDto &
    Partial<RecordTimingDto>;

export type PaymentLinkServiceParameters<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = {
  CreatePaymentLinkDto: CreatePaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  UpdatePaymentLinkDto: UpdatePaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  PaymentLinkDto: PaymentLinkDto<PaymentMethodEnum, CurrencyEnum, StatusEnum>;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
