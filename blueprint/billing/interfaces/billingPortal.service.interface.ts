import { BaseDtoParameters, IdDtoSchema } from '@forklaunch/blueprint-core';
import {
  BillingPortalDtoMapper,
  CreateBillingPortalDtoMapper,
  UpdateBillingPortalDtoMapper
} from '../models/dtoMapper/billingPortal.dtoMapper';

export type BillingPortalServiceName = typeof BillingPortalServiceName;
export const BillingPortalServiceName = 'BillingPortalService';

export const BaseBillingPortalServiceParameters = {
  CreateBillingPortalDto: CreateBillingPortalDtoMapper.schema(),
  UpdateBillingPortalDto: UpdateBillingPortalDtoMapper.schema(),
  BillingPortalDto: BillingPortalDtoMapper.schema(),
  IdDto: IdDtoSchema
};

export interface BillingPortalService<
  Params extends BaseDtoParameters<
    typeof BaseBillingPortalServiceParameters
  > = BaseDtoParameters<typeof BaseBillingPortalServiceParameters>
> {
  SchemaDefinition: typeof BaseBillingPortalServiceParameters;
  // for generating external links
  // store in cache, for permissions
  createBillingPortalSession: (
    billingPortalDto: Params['CreateBillingPortalDto']
  ) => Promise<Params['BillingPortalDto']>;
  getBillingPortalSession: (
    idDto: Params['IdDto']
  ) => Promise<Params['BillingPortalDto']>;
  updateBillingPortalSession: (
    billingPortalDto: Params['UpdateBillingPortalDto']
  ) => Promise<Params['BillingPortalDto']>;
  expireBillingPortalSession: (idDto: Params['IdDto']) => Promise<void>;
}
