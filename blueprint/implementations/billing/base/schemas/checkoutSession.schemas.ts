import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  CheckoutSessionSchema as TypeBoxCheckoutSessionSchema,
  CreateCheckoutSessionSchema as TypeBoxCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as TypeBoxUpdateCheckoutSessionSchema
} from './typebox/checkoutSession.schemas';
import {
  CheckoutSessionSchema as ZodCheckoutSessionSchema,
  CreateCheckoutSessionSchema as ZodCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema as ZodUpdateCheckoutSessionSchema
} from './zod/checkoutSession.schemas';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateCheckoutSessionSchema: TypeBoxCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema: TypeBoxUpdateCheckoutSessionSchema(uuidId),
  CheckoutSessionSchema: TypeBoxCheckoutSessionSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateCheckoutSessionSchema: ZodCreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema: ZodUpdateCheckoutSessionSchema(uuidId),
  CheckoutSessionSchema: ZodCheckoutSessionSchema(uuidId)
});

type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BaseCheckoutSessionServiceSchemas = <
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
