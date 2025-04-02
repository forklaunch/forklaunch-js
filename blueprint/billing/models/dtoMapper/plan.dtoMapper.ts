import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { PlanSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PlanCadenceEnum } from '../enum/planCadence.enum';
import { Plan } from '../persistence/plan.entity';

export class CreatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = PlanSchemas.CreatePlanSchema(PlanCadenceEnum, BillingProviderEnum);

  toEntity(): Plan {
    return Plan.create(this.dto);
  }
}

export class UpdatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = PlanSchemas.UpdatePlanSchema(PlanCadenceEnum, BillingProviderEnum);

  toEntity(): Plan {
    return Plan.update(this.dto);
  }
}

export class PlanDtoMapper extends ResponseDtoMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.PlanSchema(PlanCadenceEnum, BillingProviderEnum);

  fromEntity(plan: Plan): this {
    this.dto = plan.read();
    return this;
  }
}
