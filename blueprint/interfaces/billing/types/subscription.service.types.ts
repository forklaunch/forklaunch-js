import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreateSubscriptionDto<PartyType, BillingProviderType> = {
  partyId: string;
  partyType: PartyType[keyof PartyType];
  description?: string;
  active: boolean;
  productId: string;
  extraFields?: unknown;
  externalId: string;
  billingProvider?: BillingProviderType[keyof BillingProviderType];
  startDate: Date;
  endDate: Date;
  status: string;
};
export type UpdateSubscriptionDto<PartyType, BillingProviderType> = IdDto &
  Partial<CreateSubscriptionDto<PartyType, BillingProviderType>>;
export type SubscriptionDto<PartyType, BillingProviderType> = IdDto &
  CreateSubscriptionDto<PartyType, BillingProviderType> &
  Partial<RecordTimingDto>;

export type SubscriptionServiceParameters<PartyType, BillingProviderType> = {
  CreateSubscriptionDto: CreateSubscriptionDto<PartyType, BillingProviderType>;
  UpdateSubscriptionDto: UpdateSubscriptionDto<PartyType, BillingProviderType>;
  SubscriptionDto: SubscriptionDto<PartyType, BillingProviderType>;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
