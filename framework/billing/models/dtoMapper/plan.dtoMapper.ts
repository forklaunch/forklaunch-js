import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  boolean,
  date,
  enum_,
  number,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/framework-core';
import { BillingProvider } from '../enum/billingProvider.enum';
import { PlanCadence } from '../enum/planCadence.enum';
import { Plan } from '../persistence/plan.entity';

export type CreatePlanDto = CreatePlanDtoMapper['dto'];
export class CreatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = {
    type: string,
    name: string,
    description: optional(string),
    price: number,
    cadence: enum_(PlanCadence),
    features: optional(array(string)),
    extraFields: optional(unknown),
    externalId: string,
    billingProvider: optional(enum_(BillingProvider)),
    active: boolean
  };

  toEntity(): Plan {
    const plan = new Plan();
    plan.type = this.dto.type;
    plan.name = this.dto.name;
    if (this.dto.description) {
      plan.description = this.dto.description;
    }
    plan.price = this.dto.price;
    plan.cadence = this.dto.cadence;
    plan.features = this.dto.features ?? [];
    if (this.dto.extraFields) {
      plan.extraFields = this.dto.extraFields;
    }
    plan.externalId = this.dto.externalId;
    if (this.dto.billingProvider) {
      plan.billingProvider = this.dto.billingProvider;
    }
    plan.active = this.dto.active ?? false;

    return plan;
  }
}

export type UpdatePlanDto = UpdatePlanDtoMapper['dto'];
export class UpdatePlanDtoMapper extends RequestDtoMapper<
  Plan,
  SchemaValidator
> {
  schema = {
    id: uuid,
    type: optional(string),
    name: optional(string),
    description: optional(string),
    price: optional(number),
    cadence: optional(enum_(PlanCadence)),
    features: optional(array(string)),
    extraFields: optional(unknown),
    externalId: optional(string),
    billingProvider: optional(enum_(BillingProvider)),
    active: optional(boolean)
  };

  toEntity(): Plan {
    const plan = new Plan();
    if (this.dto.type) {
      plan.type = this.dto.type;
    }
    if (this.dto.name) {
      plan.name = this.dto.name;
    }
    if (this.dto.description) {
      plan.description = this.dto.description;
    }
    if (this.dto.price) {
      plan.price = this.dto.price;
    }
    if (this.dto.cadence) {
      plan.cadence = this.dto.cadence;
    }
    if (this.dto.features) {
      plan.features = this.dto.features;
    }
    if (this.dto.extraFields) {
      plan.extraFields = this.dto.extraFields;
    }
    if (this.dto.externalId) {
      plan.externalId = this.dto.externalId;
    }
    if (this.dto.billingProvider) {
      plan.billingProvider = this.dto.billingProvider;
    }
    if (this.dto.active) {
      plan.active = this.dto.active;
    }

    return plan;
  }
}

export type PlanDto = PlanDtoMapper['dto'];
export class PlanDtoMapper extends ResponseDtoMapper<Plan, SchemaValidator> {
  schema = {
    id: uuid,
    type: string,
    name: string,
    description: optional(string),
    price: number,
    cadence: enum_(PlanCadence),
    features: optional(array(string)),
    extraFields: optional(unknown),
    externalId: string,
    billingProvider: optional(enum_(BillingProvider)),
    active: boolean,
    createdAt: date,
    updatedAt: date
  };

  fromEntity(plan: Plan): this {
    this.dto = {
      id: plan.name,
      type: plan.type,
      name: plan.name,
      price: plan.price,
      cadence: plan.cadence,
      externalId: plan.externalId,
      active: plan.active,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };

    if (plan.description) {
      this.dto.description = plan.description;
    }
    if (plan.features) {
      this.dto.features = plan.features;
    }
    if (plan.billingProvider) {
      this.dto.billingProvider = plan.billingProvider;
    }

    return this;
  }
}
