import { BaseDtoParameters, IdDtoSchema } from '@forklaunch/blueprint-core';
import {
  CheckoutSessionDtoMapper,
  CreateCheckoutSessionDtoMapper
} from '../models/dtoMapper/checkoutSession.dtoMapper';

export type CheckoutSessionServiceName = typeof CheckoutSessionServiceName;
export const CheckoutSessionServiceName = 'CheckoutSessionService';
export const BaseCheckoutSessionServiceParameters = {
  CreateCheckoutSessionDto: CreateCheckoutSessionDtoMapper.schema(),
  CheckoutSessionDto: CheckoutSessionDtoMapper.schema(),
  IdDto: IdDtoSchema
};

export interface CheckoutSessionService<
  Params extends BaseDtoParameters<
    typeof BaseCheckoutSessionServiceParameters
  > = BaseDtoParameters<typeof BaseCheckoutSessionServiceParameters>
> {
  SchemaDefinition: typeof BaseCheckoutSessionServiceParameters;
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
