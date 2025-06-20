import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { PaymentLink } from '../../persistence/entities/paymentLink.entity';
import { PaymentLinkSchemas } from '../../registrations';
import { StatusEnum } from '../enum/status.enum';

export class CreatePaymentLinkMapper extends RequestMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.CreatePaymentLinkSchema(StatusEnum);

  async toEntity(
    em: EntityManager,
    providerFields: Stripe.PaymentLink
  ): Promise<PaymentLink> {
    return PaymentLink.create(
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

export class UpdatePaymentLinkMapper extends RequestMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.UpdatePaymentLinkSchema(StatusEnum);

  async toEntity(
    em: EntityManager,
    providerFields: Stripe.PaymentLink
  ): Promise<PaymentLink> {
    return PaymentLink.update(
      {
        ...this.dto,
        providerFields
      },
      em
    );
  }
}

export class PaymentLinkMapper extends ResponseMapper<
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
