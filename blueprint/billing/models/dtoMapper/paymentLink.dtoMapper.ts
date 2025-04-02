import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { PaymentLinkSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentLink } from '../persistence/paymentLink.entity';

export class CreatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.CreatePaymentLinkSchema(CurrencyEnum);

  toEntity(): PaymentLink {
    return PaymentLink.create(this.dto);
  }
}

export class UpdatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.UpdatePaymentLinkSchema(CurrencyEnum);

  toEntity(): PaymentLink {
    return PaymentLink.update(this.dto);
  }
}

export class PaymentLinkDtoMapper extends ResponseDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.PaymentLinkSchema(CurrencyEnum);

  fromEntity(paymentLink: PaymentLink): this {
    this.dto = paymentLink.read();
    return this;
  }
}
