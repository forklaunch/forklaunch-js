import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { Plan } from '../../persistence/entities/plan.entity';
import { PlanSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PlanCadenceEnum } from '../enum/planCadence.enum';

export class CreatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = PlanSchemas.CreatePlanSchema(PlanCadenceEnum, BillingProviderEnum);

  async toEntity(): Promise<Plan> {
    return Plan.create(this.dto);
  }
}

export class UpdatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = PlanSchemas.UpdatePlanSchema(PlanCadenceEnum, BillingProviderEnum);

  async toEntity(): Promise<Plan> {
    return Plan.update(this.dto);
  }
}

export class PlanDtoMapper extends ResponseDtoMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum);

  async fromEntity(plan: Plan): Promise<this> {
    this.dto = await plan.read();
    return this;
  }
}
