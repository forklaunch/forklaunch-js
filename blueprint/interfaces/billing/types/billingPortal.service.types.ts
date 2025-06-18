import { IdDto, RecordTimingDto } from '@forklaunch/common';

export type CreateBillingPortalDto = Partial<IdDto> & {
  customerId: string;
  uri?: string;
  expiresAt: Date;
  extraFields?: unknown;
};
export type UpdateBillingPortalDto = Partial<CreateBillingPortalDto> & IdDto;
export type BillingPortalDto = CreateBillingPortalDto &
  IdDto &
  Partial<RecordTimingDto>;

export type BillingPortalServiceParameters = {
  CreateBillingPortalDto: CreateBillingPortalDto;
  UpdateBillingPortalDto: UpdateBillingPortalDto;
  BillingPortalDto: BillingPortalDto;
  IdDto: IdDto;
};
