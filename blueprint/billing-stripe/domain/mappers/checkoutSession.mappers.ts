import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { CheckoutSessionSchemas } from '../../registrations';
import { StatusEnum } from '../enum/status.enum';

export class CreateCheckoutSessionMapper extends RequestMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.CreateCheckoutSessionSchema(StatusEnum);

  async toEntity(
    em: EntityManager,
    providerFields: Stripe.Checkout.Session
  ): Promise<CheckoutSession> {
    return CheckoutSession.create(
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

export class UpdateCheckoutSessionMapper extends RequestMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.UpdateCheckoutSessionSchema(StatusEnum);

  async toEntity(
    em: EntityManager,
    providerFields: Stripe.Checkout.Session
  ): Promise<CheckoutSession> {
    return CheckoutSession.update(
      {
        ...this.dto,
        providerFields
      },
      em
    );
  }
}

export class CheckoutSessionMapper extends ResponseMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.CheckoutSessionSchema(StatusEnum);

  async fromEntity(checkoutSession: CheckoutSession): Promise<this> {
    this.dto = {
      ...(await checkoutSession.read()),
      stripeFields: checkoutSession.providerFields
    };
    return this;
  }
}
