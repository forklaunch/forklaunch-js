import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  CreatePaymentLinkSchema as TypeBoxCreatePaymentLinkSchema,
  PaymentLinkSchema as TypeBoxPaymentLinkSchema,
  UpdatePaymentLinkSchema as TypeBoxUpdatePaymentLinkSchema
} from './typebox/paymentLink.schemas';
import {
  CreatePaymentLinkSchema as ZodCreatePaymentLinkSchema,
  PaymentLinkSchema as ZodPaymentLinkSchema,
  UpdatePaymentLinkSchema as ZodUpdatePaymentLinkSchema
} from './zod/paymentLink.schemas';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreatePaymentLinkSchema: TypeBoxCreatePaymentLinkSchema,
  UpdatePaymentLinkSchema: TypeBoxUpdatePaymentLinkSchema(uuidId),
  PaymentLinkSchema: TypeBoxPaymentLinkSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreatePaymentLinkSchema: ZodCreatePaymentLinkSchema,
  UpdatePaymentLinkSchema: ZodUpdatePaymentLinkSchema(uuidId),
  PaymentLinkSchema: ZodPaymentLinkSchema(uuidId)
});

// Type helper for return type
type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BasePaymentLinkServiceSchemas = <
  SchemaValidator extends AnySchemaValidator
>(
  schemaValidator: SchemaValidator,
  uuidId: boolean
): SchemasByValidator<SchemaValidator> => {
  switch (schemaValidator._Type) {
    case 'TypeBox':
      return TypeBoxSchemas(uuidId) as SchemasByValidator<SchemaValidator>;

    case 'Zod':
      return ZodSchemas(uuidId) as SchemasByValidator<SchemaValidator>;

    default:
      isNever(schemaValidator._Type);
      throw new Error('Invalid schema validator');
  }
};
