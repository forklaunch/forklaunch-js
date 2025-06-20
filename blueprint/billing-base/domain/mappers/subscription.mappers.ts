import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Subscription } from '../../persistence/entities/subscription.entity';
import { SubscriptionSchemas } from '../../registrations';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PartyEnum } from '../enum/party.enum';

export class CreateSubscriptionMapper extends RequestMapper<
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

export class UpdateSubscriptionMapper extends RequestMapper<
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

export class SubscriptionMapper extends ResponseMapper<
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
