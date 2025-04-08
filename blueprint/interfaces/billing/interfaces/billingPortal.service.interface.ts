import { BillingPortalServiceParameters } from '../types/billingPortal.service.types';

export interface BillingPortalService<
  Params extends BillingPortalServiceParameters = BillingPortalServiceParameters
> {
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
