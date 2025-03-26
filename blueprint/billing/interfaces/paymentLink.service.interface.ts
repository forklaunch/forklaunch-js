import { BaseDtoParameters } from '@forklaunch/blueprint-core';
import {
  CreatePaymentLinkDtoMapper,
  PaymentLinkDtoMapper,
  UpdatePaymentLinkDtoMapper
} from '../models/dtoMapper/paymentLink.dtoMapper';
import { IdDtoSchema, IdsDtoSchema } from '../registrations';

export const PaymentLinkServiceName = 'PaymentLinkService';
export const BasePaymentLinkServiceParameters = {
  CreatePaymentLinkDto: CreatePaymentLinkDtoMapper.schema(),
  UpdatePaymentLinkDto: UpdatePaymentLinkDtoMapper.schema(),
  PaymentLinkDto: PaymentLinkDtoMapper.schema(),
  IdDto: IdDtoSchema,
  IdsDto: IdsDtoSchema
};

export interface PaymentLinkService<
  Params extends BaseDtoParameters<typeof BasePaymentLinkServiceParameters>
> {
  name: typeof PaymentLinkServiceName;
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
    idsDto: Params['IdsDto']
  ) => Promise<Params['PaymentLinkDto'][]>;
}
