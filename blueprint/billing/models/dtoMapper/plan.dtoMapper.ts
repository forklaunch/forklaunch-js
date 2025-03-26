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
} from '@forklaunch/blueprint-core';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PlanCadenceEnum } from '../enum/planCadence.enum';
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
    cadence: enum_(PlanCadenceEnum),
    features: array(string),
    extraFields: optional(unknown),
    externalId: string,
    billingProvider: optional(enum_(BillingProviderEnum)),
    active: boolean
  };

  toEntity(): Plan {
    return Plan.create(this.dto);
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
    cadence: optional(enum_(PlanCadenceEnum)),
    features: optional(array(string)),
    extraFields: optional(unknown),
    externalId: optional(string),
    billingProvider: optional(enum_(BillingProviderEnum)),
    active: optional(boolean)
  };

  toEntity(): Plan {
    return Plan.update(this.dto);
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
    cadence: enum_(PlanCadenceEnum),
    features: optional(array(string)),
    extraFields: optional(unknown),
    externalId: string,
    billingProvider: optional(enum_(BillingProviderEnum)),
    active: boolean,
    createdAt: date,
    updatedAt: date
  };

  fromEntity(plan: Plan): this {
    this.dto = plan.read();
    return this;
  }
}
