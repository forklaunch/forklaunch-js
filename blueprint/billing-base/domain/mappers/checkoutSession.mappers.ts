import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { CheckoutSessionSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { StatusEnum } from '../enum/status.enum';

export class CreateCheckoutSessionMapper extends RequestMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.CreateCheckoutSessionSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  );

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

export class UpdateCheckoutSessionMapper extends RequestMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.UpdateCheckoutSessionSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  );

  async toEntity(em: EntityManager): Promise<CheckoutSession> {
    return CheckoutSession.update(this.dto, em);
  }
}

export class CheckoutSessionMapper extends ResponseMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.CheckoutSessionSchema(
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  );

  async fromEntity(checkoutSession: CheckoutSession): Promise<this> {
    this.dto = await checkoutSession.read();
    return this;
  }
}
