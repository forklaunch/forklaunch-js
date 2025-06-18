import { SchemaValidator, type } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { Plan } from '../../persistence/entities/plan.entity';
import { PlanSchemas } from '../../registrations';

export class CreatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = {
    ...PlanSchemas.CreatePlanSchema,
    providerFields: type<Stripe.Plan>()
  };

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

export class UpdatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = {
    ...PlanSchemas.UpdatePlanSchema,
    providerFields: type<Stripe.Plan>()
  };

  async toEntity(em: EntityManager): Promise<Plan> {
    return Plan.update(this.dto, em);
  }
}

export class PlanDtoMapper extends ResponseDtoMapper<Plan, SchemaValidator> {
  schema = PlanSchemas.PlanSchema;

  async fromEntity(plan: Plan): Promise<this> {
    this.dto = {
      ...(await plan.read()),
      stripeFields: plan.providerFields
    };
    return this;
  }
}
