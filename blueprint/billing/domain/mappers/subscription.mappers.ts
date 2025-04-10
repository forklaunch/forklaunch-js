import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { SubscriptionSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PartyEnum } from '../enum/party.enum';
import { Subscription } from '../../persistence/entities/subscription.entity';

export class CreateSubscriptionDtoMapper extends RequestDtoMapper<
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

export class UpdateSubscriptionDtoMapper extends RequestDtoMapper<
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

export class SubscriptionDtoMapper extends ResponseDtoMapper<
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
