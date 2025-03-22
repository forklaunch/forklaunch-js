import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  date,
  enum_,
  number,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/framework-core';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentLink } from '../persistence/paymentLink.entity';

export type CreatePaymentLinkDto = CreatePaymentLinkDtoMapper['dto'];
export class CreatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = {
    amount: number,
    currency: enum_(CurrencyEnum),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: string,
    cancelRedirectUri: string,
    extraFields: optional(unknown)
  };

  toEntity(): PaymentLink {
    return PaymentLink.create(this.dto);
  }
}

export type UpdatePaymentLinkDto = UpdatePaymentLinkDtoMapper['dto'];
export class UpdatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = {
    id: uuid,
    amount: optional(number),
    currency: optional(enum_(CurrencyEnum)),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  };

  toEntity(): PaymentLink {
    return PaymentLink.update(this.dto);
  }
}

export type PaymentLinkDto = PaymentLinkDtoMapper['dto'];
export class PaymentLinkDtoMapper extends ResponseDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = {
    id: uuid,
    amount: number,
    currency: enum_(CurrencyEnum),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown),
    createdAt: date,
    updatedAt: date
  };

  fromEntity(paymentLink: PaymentLink): this {
    this.dto = paymentLink.read();
    return this;
  }
}
