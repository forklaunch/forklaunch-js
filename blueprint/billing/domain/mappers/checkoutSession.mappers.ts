import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { CheckoutSessionSchemas } from '../../registrations';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';

export class CreateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema =
    CheckoutSessionSchemas.CreateCheckoutSessionSchema(PaymentMethodEnum);

  toEntity(): CheckoutSession {
    return CheckoutSession.create(this.dto);
  }
}

export class UpdateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema =
    CheckoutSessionSchemas.UpdateCheckoutSessionSchema(PaymentMethodEnum);

  toEntity(): CheckoutSession {
    return CheckoutSession.update(this.dto);
  }
}

export class CheckoutSessionDtoMapper extends ResponseDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.CheckoutSessionSchema(PaymentMethodEnum);

  fromEntity(checkoutSession: CheckoutSession): this {
    this.dto = checkoutSession.read();
    return this;
  }
}
