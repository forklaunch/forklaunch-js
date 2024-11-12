import {
  CreatePaymentLinkDto,
  PaymentLinkDto,
  UpdatePaymentLinkDto
} from '../models/dtoMapper/paymentLink.dtoMapper';

export interface PaymentLinkService {
  // for one off products that are not part of a subscription
  // think about how permissions work on payment links, but these should be ephemeral
  // store in cache, for permissions
  createPaymentLink: (
    paymentLink: CreatePaymentLinkDto
  ) => Promise<PaymentLinkDto>;
  updatePaymentLink: (
    paymentLink: UpdatePaymentLinkDto
  ) => Promise<PaymentLinkDto>;
  getPaymentLink: (id: string) => Promise<PaymentLinkDto>;
  expirePaymentLink: (id: string) => Promise<void>;

  handlePaymentSuccess: (id: string) => Promise<void>;
  handlePaymentFailure: (id: string) => Promise<void>;

  // admin API, make sure that permissions are correct here
  listPaymentLinks: (ids?: string[]) => Promise<PaymentLinkDto[]>;
}
