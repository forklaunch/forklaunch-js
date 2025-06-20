import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { Plan } from '../../persistence/entities/plan.entity';
import { PlanSchemas } from '../../registrations';

export class CreatePlanMapper extends RequestMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.CreatePlanSchema;

  async toEntity(
    em: EntityManager,
    providerFields: Stripe.Plan
  ): Promise<Plan> {
    return Plan.create(
      {
        ...this.dto,
        createdAt: new Date(),
        updatedAt: new Date(),
        providerFields
      },
      em
    );
  }
}

export class UpdatePlanMapper extends RequestMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.UpdatePlanSchema;

  async toEntity(em: EntityManager): Promise<Plan> {
    return Plan.update(this.dto, em);
  }
}

export class PlanMapper extends ResponseMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.PlanSchema;

  async fromEntity(plan: Plan): Promise<this> {
    this.dto = {
      ...(await plan.read()),
      stripeFields: plan.providerFields
    };
    return this;
  }
}
