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

export interface PaymentLinkService<
  CurrencyEnum,
  Params extends
    PaymentLinkServiceParameters<CurrencyEnum> = PaymentLinkServiceParameters<CurrencyEnum>
> {
  SchemaDefinition: PaymentLinkServiceParameters<CurrencyEnum>;
  // for one off products that are not part of a subscription
  // think about how permissions work on payment links, but these should be ephemeral
  // store in cache, for permissions
  createPaymentLink: (
    paymentLink: Params['CreatePaymentLinkDto']
  ) => Promise<Params['PaymentLinkDto']>;
  updatePaymentLink: (
    paymentLink: Params['UpdatePaymentLinkDto']
  ) => Promise<Params['PaymentLinkDto']>;
  getPaymentLink: (idDto: Params['IdDto']) => Promise<Params['PaymentLinkDto']>;
  expirePaymentLink: (idDto: Params['IdDto']) => Promise<void>;

  handlePaymentSuccess: (idDto: Params['IdDto']) => Promise<void>;
  handlePaymentFailure: (idDto: Params['IdDto']) => Promise<void>;

  // admin API, make sure that permissions are correct here
  listPaymentLinks: (
    idsDto?: Params['IdsDto']
  ) => Promise<Params['PaymentLinkDto'][]>;
}
