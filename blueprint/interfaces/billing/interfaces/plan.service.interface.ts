import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { EntityManager } from '@mikro-orm/core';

export type CreatePlanDto<PlanCadenceEnum, BillingProviderEnum> = {
  active: boolean;
  type: string;
  name: string;
  description?: string;
  price: number;
  cadence: PlanCadenceEnum[keyof PlanCadenceEnum];
  features?: string[];
  extraFields?: unknown;
  externalId: string;
  billingProvider?: BillingProviderEnum[keyof BillingProviderEnum];
};
export type UpdatePlanDto<PlanCadenceEnum, BillingProviderEnum> = IdDto &
  Partial<CreatePlanDto<PlanCadenceEnum, BillingProviderEnum>>;
export type PlanDto<PlanCadenceEnum, BillingProviderEnum> = IdDto &
  CreatePlanDto<PlanCadenceEnum, BillingProviderEnum> &
  Partial<RecordTimingDto>;

export type PlanServiceParameters<PlanCadenceEnum, BillingProviderEnum> = {
  CreatePlanDto: CreatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
  UpdatePlanDto: UpdatePlanDto<PlanCadenceEnum, BillingProviderEnum>;
  PlanDto: PlanDto<PlanCadenceEnum, BillingProviderEnum>;
  IdDto: IdDto;
  IdsDto: IdsDto;
};

export interface PlanService<
  PlanCadenceEnum,
  BillingProviderEnum,
  Params extends PlanServiceParameters<
    PlanCadenceEnum,
    BillingProviderEnum
  > = PlanServiceParameters<PlanCadenceEnum, BillingProviderEnum>
> {
  SchemaDefinition: PlanServiceParameters<PlanCadenceEnum, BillingProviderEnum>;

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
