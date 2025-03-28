import {
  BaseDtoParameters,
  IdDtoSchema,
  IdsDtoSchema
} from '@forklaunch/blueprint-core';
import { EntityManager } from '@mikro-orm/core';
import {
  CreateSubscriptionDtoMapper,
  SubscriptionDtoMapper,
  UpdateSubscriptionDtoMapper
} from '../models/dtoMapper/subscription.dtoMapper';

export type SubscriptionServiceName = typeof SubscriptionServiceName;
export const SubscriptionServiceName = 'SubscriptionService';

export const BaseSubscriptionServiceParameters = {
  CreateSubscriptionDto: CreateSubscriptionDtoMapper.schema(),
  SubscriptionDto: SubscriptionDtoMapper.schema(),
  UpdateSubscriptionDto: UpdateSubscriptionDtoMapper.schema(),
  IdDto: IdDtoSchema,
  IdsDto: IdsDtoSchema
};

export interface SubscriptionService<
  Params extends BaseDtoParameters<
    typeof BaseSubscriptionServiceParameters
  > = BaseDtoParameters<typeof BaseSubscriptionServiceParameters>
> {
  SchemaDefinition: typeof BaseSubscriptionServiceParameters;
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
