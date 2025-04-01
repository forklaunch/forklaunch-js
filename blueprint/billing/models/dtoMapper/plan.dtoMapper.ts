import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { PlanSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PlanCadenceEnum } from '../enum/planCadence.enum';
import { Plan } from '../persistence/plan.entity';

export type CreatePlanDto = CreatePlanDtoMapperDefinition['dto'];
export const CreatePlanDtoMapper = () =>
  new CreatePlanDtoMapperDefinition(SchemaValidator());
export class CreatePlanDtoMapperDefinition extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = PlanSchemas.CreatePlanSchema(PlanCadenceEnum, BillingProviderEnum);

  toEntity(): Plan {
    return Plan.create(this.dto);
  }
}

export type UpdatePlanDto = UpdatePlanDtoMapperDefinition['dto'];
export const UpdatePlanDtoMapper = () =>
  new UpdatePlanDtoMapperDefinition(SchemaValidator());
export class UpdatePlanDtoMapperDefinition extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = PlanSchemas.UpdatePlanSchema(PlanCadenceEnum, BillingProviderEnum);

  toEntity(): Plan {
    return Plan.update(this.dto);
  }
}

export type PlanDto = PlanDtoMapperDefinition['dto'];
export const PlanDtoMapper = () =>
  new PlanDtoMapperDefinition(SchemaValidator());
export class PlanDtoMapperDefinition extends ResponseDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum);

  fromEntity(plan: Plan): this {
    this.dto = plan.read();
    return this;
  }
}
