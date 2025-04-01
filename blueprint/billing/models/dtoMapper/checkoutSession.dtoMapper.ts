import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { CheckoutSessionSchemas } from '../../registrations';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { CheckoutSession } from '../persistence/checkoutSession.entity';

export type CreateCheckoutSessionDto =
  CreateCheckoutSessionDtoMapperDefinition['dto'];
export const CreateCheckoutSessionDtoMapper = () =>
  new CreateCheckoutSessionDtoMapperDefinition(SchemaValidator());
export class CreateCheckoutSessionDtoMapperDefinition extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema =
    CheckoutSessionSchemas.CreateCheckoutSessionSchema(PaymentMethodEnum);

  toEntity(): CheckoutSession {
    return CheckoutSession.create(this.dto);
  }
}

export type UpdateCheckoutSessionDto =
  UpdateCheckoutSessionDtoMapperDefinition['dto'];
export const UpdateCheckoutSessionDtoMapper = () =>
  new UpdateCheckoutSessionDtoMapperDefinition(SchemaValidator());
export class UpdateCheckoutSessionDtoMapperDefinition extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema =
    CheckoutSessionSchemas.UpdateCheckoutSessionSchema(PaymentMethodEnum);

  toEntity(): CheckoutSession {
    return CheckoutSession.update(this.dto);
  }
}

export type CheckoutSessionDto = CheckoutSessionDtoMapperDefinition['dto'];
export const CheckoutSessionDtoMapper = () =>
  new CheckoutSessionDtoMapperDefinition(SchemaValidator());
export class CheckoutSessionDtoMapperDefinition extends ResponseDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = CheckoutSessionSchemas.CheckoutSessionSchema(PaymentMethodEnum);

  fromEntity(checkoutSession: CheckoutSession): this {
    this.dto = checkoutSession.read();
    return this;
  }
}
