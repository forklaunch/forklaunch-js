import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { CheckoutSessionSchemas } from '../../registrations';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';

export class CreateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema =
    CheckoutSessionSchemas.CreateCheckoutSessionSchema(PaymentMethodEnum);

  async toEntity(): Promise<CheckoutSession> {
    return CheckoutSession.create(this.dto);
  }
}

export class UpdateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema =
    CheckoutSessionSchemas.UpdateCheckoutSessionSchema(PaymentMethodEnum);

  async toEntity(): Promise<CheckoutSession> {
    return CheckoutSession.update(this.dto);
  }
}

export class CheckoutSessionDtoMapper extends ResponseDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.CheckoutSessionSchema(PaymentMethodEnum);

  async fromEntity(checkoutSession: CheckoutSession): Promise<this> {
    this.dto = await checkoutSession.read();
    return this;
  }
}
