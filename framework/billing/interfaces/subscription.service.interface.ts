import { EntityManager } from '@mikro-orm/core';
import {
  CreateSubscriptionDto,
  SubscriptionDto,
  UpdateSubscriptionDto
} from '../models/dtoMapper/subscription.dtoMapper';

export interface SubscriptionService {
  // store this in a table
  createSubscription: (
    subscriptionDto: CreateSubscriptionDto,
    em?: EntityManager
  ) => Promise<SubscriptionDto>;
  getSubscription: (id: string, em?: EntityManager) => Promise<SubscriptionDto>;
  getUserSubscription: (
    id: string,
    em?: EntityManager
  ) => Promise<SubscriptionDto>;
  getOrganizationSubscription: (
    id: string,
    em?: EntityManager
  ) => Promise<SubscriptionDto>;
  updateSubscription: (
    subscriptionDto: UpdateSubscriptionDto,
    em?: EntityManager
  ) => Promise<SubscriptionDto>;
  deleteSubscription: (id: string, em?: EntityManager) => Promise<void>;
  listSubscriptions: (
    ids?: string[],
    em?: EntityManager
  ) => Promise<SubscriptionDto[]>;
  cancelSubscription: (id: string, em?: EntityManager) => Promise<void>;
  resumeSubscription: (id: string, em?: EntityManager) => Promise<void>;
}
