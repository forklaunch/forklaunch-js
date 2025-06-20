import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { PaymentLink } from '../../persistence/entities/paymentLink.entity';
import { PaymentLinkSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { StatusEnum } from '../enum/status.enum';

export class CreatePaymentLinkMapper extends RequestMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.CreatePaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  );

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

export class UpdatePaymentLinkMapper extends RequestMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.UpdatePaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  );

  async toEntity(em: EntityManager): Promise<PaymentLink> {
    return PaymentLink.update(this.dto, em);
  }
}

export class PaymentLinkMapper extends ResponseMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.PaymentLinkSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  );

  async fromEntity(paymentLink: PaymentLink): Promise<this> {
    this.dto = await paymentLink.read();
    return this;
  }
}
