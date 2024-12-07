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
} from '@forklaunch/framework-core';
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
    const subscription = new Subscription();
    if (this.dto.description) {
      subscription.description = this.dto.description;
    }
    subscription.startDate = this.dto.startDate;
    subscription.endDate = this.dto.endDate;
    subscription.status = this.dto.status;
    subscription.partyId = this.dto.partyId;
    subscription.partyType = this.dto.partyType;
    subscription.active = this.dto.active ?? false;
    subscription.productId = this.dto.productId;
    subscription.externalId = this.dto.externalId;
    if (this.dto.billingProvider) {
      subscription.billingProvider = this.dto.billingProvider;
    }
    if (this.dto.extraFields) {
      subscription.extraFields = this.dto.extraFields;
    }

    return subscription;
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
    const subscription = new Subscription();
    subscription.id = this.dto.id;
    if (this.dto.partyId) {
      subscription.partyId = this.dto.partyId;
    }
    if (this.dto.partyType) {
      subscription.partyType = this.dto.partyType;
    }
    if (this.dto.productId) {
      subscription.productId = this.dto.productId;
    }
    if (this.dto.description) {
      subscription.description = this.dto.description;
    }
    if (this.dto.active) {
      subscription.active = this.dto.active;
    }
    if (this.dto.externalId) {
      subscription.externalId = this.dto.externalId;
    }
    if (this.dto.startDate) {
      subscription.startDate = this.dto.startDate;
    }
    if (this.dto.endDate) {
      subscription.endDate = this.dto.endDate;
    }
    if (this.dto.status) {
      subscription.status = this.dto.status;
    }
    if (this.dto.billingProvider) {
      subscription.billingProvider = this.dto.billingProvider;
    }
    if (this.dto.extraFields) {
      subscription.extraFields = this.dto.extraFields;
    }
    return subscription;
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
    this.dto = {
      id: entity.id,
      partyId: entity.partyId,
      partyType: entity.partyType,
      productId: entity.productId,
      active: entity.active,
      externalId: entity.externalId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
    if (entity.description) {
      this.dto.description = entity.description;
    }
    if (entity.billingProvider) {
      this.dto.billingProvider = entity.billingProvider;
    }
    if (entity.extraFields) {
      this.dto.extraFields = entity.extraFields;
    }

    return this;
  }
}
