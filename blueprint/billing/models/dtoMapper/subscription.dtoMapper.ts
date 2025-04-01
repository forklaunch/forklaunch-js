import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { SubscriptionSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PartyEnum } from '../enum/party.enum';
import { Subscription } from '../persistence/subscription.entity';

export type CreateSubscriptionDto =
  CreateSubscriptionDtoMapperDefinition['dto'];
export const CreateSubscriptionDtoMapper = () =>
  new CreateSubscriptionDtoMapperDefinition(SchemaValidator());
export class CreateSubscriptionDtoMapperDefinition extends RequestDtoMapper<
  Subscription,
  SchemaValidator
> {
  schema = SubscriptionSchemas.CreateSubscriptionSchema(
    PartyEnum,
    BillingProviderEnum
  );

  toEntity(): Subscription {
    return Subscription.create(this.dto);
  }
}

export type UpdateSubscriptionDto =
  UpdateSubscriptionDtoMapperDefinition['dto'];
export const UpdateSubscriptionDtoMapper = () =>
  new UpdateSubscriptionDtoMapperDefinition(SchemaValidator());
export class UpdateSubscriptionDtoMapperDefinition extends RequestDtoMapper<
  Subscription,
  SchemaValidator
> {
  schema = SubscriptionSchemas.UpdateSubscriptionSchema(
    PartyEnum,
    BillingProviderEnum
  );

  toEntity(): Subscription {
    return Subscription.update(this.dto);
  }
}

export type SubscriptionDto = SubscriptionDtoMapperDefinition['dto'];
export const SubscriptionDtoMapper = () =>
  new SubscriptionDtoMapperDefinition(SchemaValidator());
export class SubscriptionDtoMapperDefinition extends ResponseDtoMapper<
  Subscription,
  SchemaValidator
> {
  schema = SubscriptionSchemas.SubscriptionSchema(
    PartyEnum,
    BillingProviderEnum
  );

  fromEntity(entity: Subscription): this {
    this.dto = entity.read();
    return this;
  }
}
