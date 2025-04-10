import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreatePaymentLinkDto<CurrencyEnum> = {
  amount: number;
  currency: CurrencyEnum[keyof CurrencyEnum];
  metadata?: unknown;
  successRedirectUri: string;
  cancelRedirectUri: string;
  extraFields?: unknown;
};
export type UpdatePaymentLinkDto<CurrencyEnum> = IdDto &
  Partial<CreatePaymentLinkDto<CurrencyEnum>>;
export type PaymentLinkDto<CurrencyEnum> = IdDto &
  CreatePaymentLinkDto<CurrencyEnum> &
  Partial<RecordTimingDto>;

export type PaymentLinkServiceParameters<CurrencyEnum> = {
  CreatePaymentLinkDto: CreatePaymentLinkDto<CurrencyEnum>;
  UpdatePaymentLinkDto: UpdatePaymentLinkDto<CurrencyEnum>;
  PaymentLinkDto: PaymentLinkDto<CurrencyEnum>;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
