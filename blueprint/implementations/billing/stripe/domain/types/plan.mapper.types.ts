import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { StripePlanDtos } from './stripe.dto.types';
import { StripePlanEntities } from './stripe.entity.types';

export type StripePlanMappers<
  Entities extends StripePlanEntities,
  Dto extends StripePlanDtos
> = {
  PlanMapper: {
    toDomain: (entity: Entities['PlanMapper']) => Promise<Dto['PlanMapper']>;
  };
  CreatePlanMapper: {
    toEntity: (
      dto: Dto['CreatePlanMapper'],
      em: EntityManager,
      stripePlan: Stripe.Plan,
      ...args: unknown[]
    ) => Promise<Entities['CreatePlanMapper']>;
  };
  UpdatePlanMapper: {
    toEntity: (
      dto: Dto['UpdatePlanMapper'],
      em: EntityManager,
      stripePlan: Stripe.Plan,
      ...args: unknown[]
    ) => Promise<Entities['UpdatePlanMapper']>;
  };
};
