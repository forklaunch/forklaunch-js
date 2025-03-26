import { BaseDtoParameters } from '@forklaunch/blueprint-core';
import {
  CheckoutSessionDtoMapper,
  CreateCheckoutSessionDtoMapper
} from '../models/dtoMapper/checkoutSession.dtoMapper';
import { IdDtoSchema } from '../registrations';

export const CheckoutSessionServiceName = 'CheckoutSessionService';
export const BaseCheckoutSessionServiceParameters = {
  CreateCheckoutSessionDto: CreateCheckoutSessionDtoMapper.schema(),
  CheckoutSessionDto: CheckoutSessionDtoMapper.schema(),
  IdDto: IdDtoSchema
};

export interface CheckoutSessionService<
  Params extends BaseDtoParameters<typeof BaseCheckoutSessionServiceParameters>
> {
  name: typeof CheckoutSessionServiceName;
  // for generating external links
  // store in cache, for permissions
  createCheckoutSession: (
    checkoutSessionDto: Params['CreateCheckoutSessionDto']
  ) => Promise<Params['CheckoutSessionDto']>;
  getCheckoutSession: (
    idDto: Params['IdDto']
  ) => Promise<Params['CheckoutSessionDto']>;
  expireCheckoutSession: (idDto: Params['IdDto']) => Promise<void>;

  handleCheckoutSuccess: (idDto: Params['IdDto']) => Promise<void>;
  handleCheckoutFailure: (idDto: Params['IdDto']) => Promise<void>;
}
