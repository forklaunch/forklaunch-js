import { EntityManager } from '@mikro-orm/core';
import { SubscriptionServiceParameters } from '../types/subscription.service.types';

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
