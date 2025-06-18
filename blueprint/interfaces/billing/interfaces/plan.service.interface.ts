import { EntityManager } from '@mikro-orm/core';
import { PlanServiceParameters } from '../types/plan.service.types';

export interface PlanService<
  PlanCadenceEnum,
  CurrencyEnum,
  BillingProviderEnum,
  Params extends PlanServiceParameters<
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  > = PlanServiceParameters<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>
> {
  createPlan: (
    planDto: Params['CreatePlanDto'],
    em?: EntityManager
  ) => Promise<Params['PlanDto']>;
  getPlan: (
    idDto: Params['IdDto'],
    em?: EntityManager
  ) => Promise<Params['PlanDto']>;
  updatePlan: (
    planDto: Params['UpdatePlanDto'],
    em?: EntityManager
  ) => Promise<Params['PlanDto']>;
  deletePlan: (idDto: Params['IdDto'], em?: EntityManager) => Promise<void>;
  listPlans: (
    idsDto?: Params['IdsDto'],
    em?: EntityManager
  ) => Promise<Params['PlanDto'][]>;
}
