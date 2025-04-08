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
