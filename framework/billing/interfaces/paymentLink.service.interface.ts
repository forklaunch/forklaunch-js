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
  // invalidates payment link
  updatePaymentLink: (
    paymentLink: UpdatePaymentLinkDto
  ) => Promise<PaymentLinkDto>;
  // get metadata about the payment link
  getPaymentLink: (id: string) => Promise<PaymentLinkDto>;
  // admin API, make sure that permissions are correct here
  listPaymentLinks: (ids?: string[]) => Promise<PaymentLinkDto[]>;
}
