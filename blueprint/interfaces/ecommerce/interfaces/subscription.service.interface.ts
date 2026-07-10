import { EntityManager } from '@mikro-orm/core';
import { SubscriptionServiceParameters } from '../types/subscription.service.types';

export interface SubscriptionService<
  Params extends SubscriptionServiceParameters = SubscriptionServiceParameters
> {
  createSubscription: (
    subscriptionDto: Params['CreateSubscriptionDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  getSubscription: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  listSubscriptions: (
    idsDto?: Params['IdsDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto'][]>;
  /** Handles pause/resume/cancel (via status) and cadence/item changes. */
  updateSubscription: (
    subscriptionDto: Params['UpdateSubscriptionDto'],
    em?: EntityManager
  ) => Promise<Params['SubscriptionDto']>;
  deleteSubscription: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<void>;
}
