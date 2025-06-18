import { SchemaValidator, type } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { PaymentLink } from '../../persistence/entities/paymentLink.entity';
import { PaymentLinkSchemas } from '../../registrations';
import { StatusEnum } from '../enum/status.enum';

export class CreatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = {
    ...PaymentLinkSchemas.CreatePaymentLinkSchema(StatusEnum),
    providerFields: type<Stripe.PaymentLink>()
  };

  async toEntity(em: EntityManager): Promise<PaymentLink> {
    return PaymentLink.create(
      {
        ...this.dto,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = {
    ...PaymentLinkSchemas.UpdatePaymentLinkSchema(StatusEnum),
    providerFields: type<Stripe.PaymentLink>()
  };

  async toEntity(em: EntityManager): Promise<PaymentLink> {
    return PaymentLink.update(this.dto, em);
  }
}

export class PaymentLinkDtoMapper extends ResponseDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.PaymentLinkSchema(StatusEnum);

  async fromEntity(paymentLink: PaymentLink): Promise<this> {
    this.dto = {
      ...(await paymentLink.read()),
      stripeFields: paymentLink.providerFields
    };
    return this;
  }
}
