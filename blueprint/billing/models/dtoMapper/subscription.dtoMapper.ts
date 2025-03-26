import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  boolean,
  date,
  enum_,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/blueprint-core';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PartyEnum } from '../enum/party.enum';
import { Subscription } from '../persistence/subscription.entity';

export type CreateSubscriptionDto = CreateSubscriptionDtoMapper['dto'];
export class CreateSubscriptionDtoMapper extends RequestDtoMapper<
  Subscription,
  SchemaValidator
> {
  schema = {
    partyId: string,
    partyType: enum_(PartyEnum),
    productId: string,
    description: optional(string),
    active: boolean,
    externalId: string,
    startDate: date,
    endDate: date,
    status: string,
    billingProvider: optional(enum_(BillingProviderEnum)),
    extraFields: optional(unknown)
  };

  toEntity(): Subscription {
    return Subscription.create(this.dto);
  }
}

export type UpdateSubscriptionDto = UpdateSubscriptionDtoMapper['dto'];
export class UpdateSubscriptionDtoMapper extends RequestDtoMapper<
  Subscription,
  SchemaValidator
> {
  schema = {
    id: uuid,
    partyId: optional(string),
    partyType: optional(enum_(PartyEnum)),
    productId: optional(string),
    description: optional(string),
    active: optional(boolean),
    externalId: optional(string),
    startDate: optional(date),
    endDate: optional(date),
    status: optional(string),
    billingProvider: optional(enum_(BillingProviderEnum)),
    extraFields: optional(unknown)
  };

  toEntity(): Subscription {
    return Subscription.update(this.dto);
  }
}

export type SubscriptionDto = SubscriptionDtoMapper['dto'];
export class SubscriptionDtoMapper extends ResponseDtoMapper<
  Subscription,
  SchemaValidator
> {
  schema = {
    id: uuid,
    partyId: string,
    partyType: enum_(PartyEnum),
    productId: string,
    description: optional(string),
    active: boolean,
    externalId: string,
    startDate: date,
    endDate: date,
    status: string,
    billingProvider: optional(enum_(BillingProviderEnum)),
    extraFields: optional(unknown),
    createdAt: date,
    updatedAt: date
  };

  fromEntity(entity: Subscription): this {
    this.dto = entity.read();
    return this;
  }
}
