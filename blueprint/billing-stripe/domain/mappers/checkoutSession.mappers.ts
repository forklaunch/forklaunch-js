import { SchemaValidator, type } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { CheckoutSessionSchemas } from '../../registrations';
import { StatusEnum } from '../enum/status.enum';

export class CreateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = {
    ...CheckoutSessionSchemas.CreateCheckoutSessionSchema(StatusEnum),
    providerFields: type<Stripe.Checkout.Session>()
  };

  async toEntity(em: EntityManager): Promise<CheckoutSession> {
    return CheckoutSession.create(
      {
        ...this.dto,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = {
    ...CheckoutSessionSchemas.UpdateCheckoutSessionSchema(StatusEnum),
    providerFields: type<Stripe.Checkout.Session>()
  };

  async toEntity(em: EntityManager): Promise<CheckoutSession> {
    return CheckoutSession.update(this.dto, em);
  }
}

export class CheckoutSessionDtoMapper extends ResponseDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = {
    ...CheckoutSessionSchemas.CheckoutSessionSchema(StatusEnum),
    stripeFields: type<Stripe.Checkout.Session>()
  };

  async fromEntity(checkoutSession: CheckoutSession): Promise<this> {
    this.dto = {
      ...(await checkoutSession.read()),
      stripeFields: checkoutSession.providerFields
    };
    return this;
  }
}
