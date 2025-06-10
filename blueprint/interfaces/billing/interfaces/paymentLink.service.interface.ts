import { PaymentLinkServiceParameters } from '../types/paymentLink.service.types';

export interface PaymentLinkService<
  CurrencyEnum,
  StatusEnum,
  Params extends PaymentLinkServiceParameters<
    CurrencyEnum,
    StatusEnum
  > = PaymentLinkServiceParameters<CurrencyEnum, StatusEnum>
> {
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
