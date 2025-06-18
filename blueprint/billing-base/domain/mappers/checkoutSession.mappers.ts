import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { CheckoutSessionSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { StatusEnum } from '../enum/status.enum';

export class CreateCheckoutSessionDtoMapper extends RequestDtoMapper<
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

export class UpdateCheckoutSessionDtoMapper extends RequestDtoMapper<
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

export class CheckoutSessionDtoMapper extends ResponseDtoMapper<
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
