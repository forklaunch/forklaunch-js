import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  enum_,
  number,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/framework-core';
import { Currency } from '../enum/currency.enum';
import { PaymentLink } from '../persistence/paymentLink.entity';

export type CreatePaymentLinkDto = CreatePaymentLinkDtoMapper['dto'];
export class CreatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = {
    amount: number,
    currency: enum_(Currency),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  };

  toEntity(): PaymentLink {
    const paymentLink = new PaymentLink();
    paymentLink.amount = this.dto.amount;
    paymentLink.currency = this.dto.currency;
    if (this.dto.description) {
      paymentLink.description = this.dto.description;
    }
    if (this.dto.metadata) {
      paymentLink.metadata = this.dto.metadata;
    }
    if (this.dto.successRedirectUri) {
      paymentLink.successRedirectUri = this.dto.successRedirectUri;
    }
    if (this.dto.cancelRedirectUri) {
      paymentLink.cancelRedirectUri = this.dto.cancelRedirectUri;
    }
    if (this.dto.extraFields) {
      paymentLink.extraFields = this.dto.extraFields;
    }
    return paymentLink;
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
    currency: optional(enum_(Currency)),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  };

  toEntity(): PaymentLink {
    const paymentLink = new PaymentLink();
    paymentLink.id = this.dto.id;
    if (this.dto.amount) {
      paymentLink.amount = this.dto.amount;
    }
    if (this.dto.currency) {
      paymentLink.currency = this.dto.currency;
    }
    if (this.dto.description) {
      paymentLink.description = this.dto.description;
    }
    if (this.dto.metadata) {
      paymentLink.metadata = this.dto.metadata;
    }
    if (this.dto.successRedirectUri) {
      paymentLink.successRedirectUri = this.dto.successRedirectUri;
    }
    if (this.dto.cancelRedirectUri) {
      paymentLink.cancelRedirectUri = this.dto.cancelRedirectUri;
    }
    if (this.dto.extraFields) {
      paymentLink.extraFields = this.dto.extraFields;
    }
    return paymentLink;
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
    currency: enum_(Currency),
    description: optional(string),
    metadata: optional(unknown),
    successRedirectUri: optional(string),
    cancelRedirectUri: optional(string),
    extraFields: optional(unknown)
  };

  fromEntity(paymentLink: PaymentLink): this {
    this.dto = {
      id: paymentLink.id,
      amount: paymentLink.amount,
      currency: paymentLink.currency
    };

    if (paymentLink.description) {
      this.dto.description = paymentLink.description;
    }
    if (paymentLink.metadata) {
      this.dto.metadata = paymentLink.metadata;
    }
    if (paymentLink.successRedirectUri) {
      this.dto.successRedirectUri = paymentLink.successRedirectUri;
    }
    if (paymentLink.cancelRedirectUri) {
      this.dto.cancelRedirectUri = paymentLink.cancelRedirectUri;
    }
    if (paymentLink.extraFields) {
      this.dto.extraFields = paymentLink.extraFields;
    }

    return this;
  }
}
