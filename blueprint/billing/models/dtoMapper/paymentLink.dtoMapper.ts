import { SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { PaymentLinkSchemas } from '../../registrations';
import { CurrencyEnum } from '../enum/currency.enum';
import { PaymentLink } from '../persistence/paymentLink.entity';

export type CreatePaymentLinkDto = CreatePaymentLinkDtoMapperDefinition['dto'];
export const CreatePaymentLinkDtoMapper = () =>
  new CreatePaymentLinkDtoMapperDefinition(SchemaValidator());
export class CreatePaymentLinkDtoMapperDefinition extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.CreatePaymentLinkSchema(CurrencyEnum);

  toEntity(): PaymentLink {
    return PaymentLink.create(this.dto);
  }
}

export type UpdatePaymentLinkDto = UpdatePaymentLinkDtoMapperDefinition['dto'];
export const UpdatePaymentLinkDtoMapper = () =>
  new UpdatePaymentLinkDtoMapperDefinition(SchemaValidator());
export class UpdatePaymentLinkDtoMapperDefinition extends RequestDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.UpdatePaymentLinkSchema(CurrencyEnum);

  toEntity(): PaymentLink {
    return PaymentLink.update(this.dto);
  }
}

export type PaymentLinkDto = PaymentLinkDtoMapperDefinition['dto'];
export const PaymentLinkDtoMapper = () =>
  new PaymentLinkDtoMapperDefinition(SchemaValidator());
export class PaymentLinkDtoMapperDefinition extends ResponseDtoMapper<
  PaymentLink,
  SchemaValidator
> {
  schema = PaymentLinkSchemas.PaymentLinkSchema(CurrencyEnum);

  fromEntity(paymentLink: PaymentLink): this {
    this.dto = paymentLink.read();
    return this;
  }
}
