import {
  BaseDtoParameters,
  IdDtoSchema,
  IdsDtoSchema
} from '@forklaunch/blueprint-core';
import { EntityManager } from '@mikro-orm/core';
import {
  CreatePlanDtoMapper,
  PlanDtoMapper,
  UpdatePlanDtoMapper
} from '../models/dtoMapper/plan.dtoMapper';

export type PlanServiceName = typeof PlanServiceName;
export const PlanServiceName = 'PlanService';

export const BasePlanServiceParameters = {
  CreatePlanDto: CreatePlanDtoMapper.schema(),
  UpdatePlanDto: UpdatePlanDtoMapper.schema(),
  PlanDto: PlanDtoMapper.schema(),
  IdDto: IdDtoSchema,
  IdsDto: IdsDtoSchema
};

export interface PlanService<
  Params extends BaseDtoParameters<
    typeof BasePlanServiceParameters
  > = BaseDtoParameters<typeof BasePlanServiceParameters>
> {
  SchemaDefinition: typeof BasePlanServiceParameters;

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
