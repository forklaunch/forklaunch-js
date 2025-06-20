import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Plan } from '../../persistence/entities/plan.entity';
import { PlanSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { CurrencyEnum } from '../enum/currency.enum';
import { PlanCadenceEnum } from '../enum/planCadence.enum';

export class CreatePlanMapper extends RequestMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.CreatePlanSchema(
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  );

  async toEntity(em: EntityManager): Promise<Plan> {
    return Plan.create(
      {
        ...this.dto,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdatePlanMapper extends RequestMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.UpdatePlanSchema(
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  );

  async toEntity(em: EntityManager): Promise<Plan> {
    return Plan.update(this.dto, em);
  }
}

export class PlanMapper extends ResponseMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.PlanSchema(
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  );

  async fromEntity(plan: Plan): Promise<this> {
    this.dto = await plan.read();
    return this;
  }
}
