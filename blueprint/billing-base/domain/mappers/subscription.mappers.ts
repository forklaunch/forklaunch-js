import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Subscription } from '../../persistence/entities/subscription.entity';
import { SubscriptionSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PartyEnum } from '../enum/party.enum';

export class CreateSubscriptionDtoMapper extends RequestDtoMapper<
  Subscription,
  SchemaValidator
> {
  schema = SubscriptionSchemas.CreateSubscriptionSchema(
    PartyEnum,
    BillingProviderEnum
  );

  async toEntity(em: EntityManager): Promise<Subscription> {
    return Subscription.create(
      {
        ...this.dto,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
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

  async toEntity(em: EntityManager): Promise<Subscription> {
    return Subscription.update(this.dto, em);
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

  async fromEntity(entity: Subscription): Promise<this> {
    this.dto = await entity.read();
    return this;
  }
}
