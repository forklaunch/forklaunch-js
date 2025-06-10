import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreatePaymentLinkDto<CurrencyEnum, StatusEnum> = {
  amount: number;
  currency: CurrencyEnum[keyof CurrencyEnum];
  metadata?: unknown;
  successRedirectUri: string;
  cancelRedirectUri: string;
  expiresAt: Date;
  status: StatusEnum[keyof StatusEnum];
  extraFields?: unknown;
};
export type UpdatePaymentLinkDto<CurrencyEnum, StatusEnum> = IdDto &
  Partial<CreatePaymentLinkDto<CurrencyEnum, StatusEnum>>;
export type PaymentLinkDto<CurrencyEnum, StatusEnum> = IdDto &
  CreatePaymentLinkDto<CurrencyEnum, StatusEnum> &
  Partial<RecordTimingDto>;

export type PaymentLinkServiceParameters<CurrencyEnum, StatusEnum> = {
  CreatePaymentLinkDto: CreatePaymentLinkDto<CurrencyEnum, StatusEnum>;
  UpdatePaymentLinkDto: UpdatePaymentLinkDto<CurrencyEnum, StatusEnum>;
  PaymentLinkDto: PaymentLinkDto<CurrencyEnum, StatusEnum>;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
