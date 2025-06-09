import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { PaymentLink } from '../../persistence/entities/paymentLink.entity';
import { PaymentLinkSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';

export class CreatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.CreatePaymentLinkSchema(CurrencyEnum);

  async toEntity(): Promise<PaymentLink> {
    return PaymentLink.create(this.dto);
  }
}

export class UpdatePaymentLinkDtoMapper extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.UpdatePaymentLinkSchema(CurrencyEnum);

  async toEntity(): Promise<PaymentLink> {
    return PaymentLink.update(this.dto);
  }
}

export class PaymentLinkDtoMapper extends ResponseDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.PaymentLinkSchema(CurrencyEnum);

  async fromEntity(paymentLink: PaymentLink): Promise<this> {
    this.dto = await paymentLink.read();
    return this;
  }
}
