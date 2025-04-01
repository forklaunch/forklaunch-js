import { IdDto, RecordTimingDto } from '@forklaunch/common';

export type CreateBillingPortalDto = {
  customerId: string;
  uri: string;
  expiresAt: Date;
  extraFields?: unknown;
};
export type UpdateBillingPortalDto = IdDto & Partial<CreateBillingPortalDto>;
export type BillingPortalDto = IdDto &
  CreateBillingPortalDto &
  Partial<RecordTimingDto>;

export type BillingPortalServiceParameters = {
  CreateBillingPortalDto: CreateBillingPortalDto;
  UpdateBillingPortalDto: UpdateBillingPortalDto;
  BillingPortalDto: BillingPortalDto;
  IdDto: IdDto;
};

export interface BillingPortalService<
  Params extends BillingPortalServiceParameters = BillingPortalServiceParameters
> {
  SchemaDefinition: BillingPortalServiceParameters;
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
