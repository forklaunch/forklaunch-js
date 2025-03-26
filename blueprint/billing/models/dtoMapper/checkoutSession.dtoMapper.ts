import {
  array,
  date,
  enum_,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';
import { CheckoutSession } from '../persistence/checkoutSession';

export type CreateCheckoutSessionDto = CreateCheckoutSessionDtoMapper['dto'];
export class CreateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = {
    customerId: string,
    paymentMethods: array(enum_(PaymentMethodEnum)),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown)
  };

  toEntity(): CheckoutSession {
    return CheckoutSession.create(this.dto);
  }
}

export type UpdateCheckoutSessionDto = UpdateCheckoutSessionDtoMapper['dto'];
export class UpdateCheckoutSessionDtoMapper extends RequestDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = {
    id: uuid,
    customerId: optional(string),
    paymentMethods: optional(array(enum_(PaymentMethodEnum))),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  };

  toEntity(): CheckoutSession {
    return CheckoutSession.update(this.dto);
  }
}

export type CheckoutSessionDto = CheckoutSessionDtoMapper['dto'];
export class CheckoutSessionDtoMapper extends ResponseDtoMapper<
  CheckoutSession,
  SchemaValidator
> {
  schema = {
    id: uuid,
    customerId: string,
    paymentMethods: array(enum_(PaymentMethodEnum)),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown),
    createdAt: date,
    updatedAt: date
  };

  fromEntity(checkoutSession: CheckoutSession): this {
    this.dto = checkoutSession.read();
    return this;
  }
}
