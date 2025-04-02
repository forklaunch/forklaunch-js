import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { EntityManager } from '@mikro-orm/core';

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

export interface SubscriptionService<
  PartyType,
  BillingProviderType,
  Params extends SubscriptionServiceParameters<
    PartyType,
    BillingProviderType
  > = SubscriptionServiceParameters<PartyType, BillingProviderType>
> {
  // store this in a table
  createSubscription: (
    subscriptionDto: Params['CreateSubscriptionDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  getSubscription: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  getUserSubscription: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  getOrganizationSubscription: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  updateSubscription: (
    subscriptionDto: Params['UpdateSubscriptionDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  deleteSubscription: (
    id: Params['IdDto'],
    em?: EntityManager
  ) => Promise<void>;
  listSubscriptions: (
    idsDto: Params['IdsDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto'][]>;
  cancelSubscription: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<void>;
  resumeSubscription: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<void>;
}
