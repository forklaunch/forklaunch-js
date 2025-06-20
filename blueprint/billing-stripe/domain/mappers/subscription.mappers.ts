import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { Subscription } from '../../persistence/entities/subscription.entity';
import { SubscriptionSchemas } from '../../registrations';
import { PartyEnum } from '../enum/party.enum';

export class CreateSubscriptionMapper extends RequestMapper<
  Subscription,
  SchemaValidator
> {
  schema = SubscriptionSchemas.CreateSubscriptionSchema(PartyEnum);

  async toEntity(
    em: EntityManager,
    providerFields: Stripe.Subscription
  ): Promise<Subscription> {
    return Subscription.create(
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

export class UpdateSubscriptionMapper extends RequestMapper<
  Subscription,
  SchemaValidator
> {
  schema = SubscriptionSchemas.UpdateSubscriptionSchema(PartyEnum);

  async toEntity(
    em: EntityManager,
    providerFields: Stripe.Subscription
  ): Promise<Subscription> {
    return Subscription.update(
      {
        ...this.dto,
        providerFields
      },
      em
    );
  }
}

export class SubscriptionMapper extends ResponseMapper<
  Subscription,
  SchemaValidator
> {
  schema = SubscriptionSchemas.SubscriptionSchema(PartyEnum);

  async fromEntity(entity: Subscription): Promise<this> {
    this.dto = {
      ...(await entity.read()),
      stripeFields: entity.providerFields
    };
    return this;
  }
}
