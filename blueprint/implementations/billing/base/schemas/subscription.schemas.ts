import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  CreateSubscriptionSchema as TypeBoxCreateSubscriptionSchema,
  SubscriptionSchema as TypeBoxSubscriptionSchema,
  UpdateSubscriptionSchema as TypeBoxUpdateSubscriptionSchema
} from './typebox/subscription.schemas';
import {
  CreateSubscriptionSchema as ZodCreateSubscriptionSchema,
  SubscriptionSchema as ZodSubscriptionSchema,
  UpdateSubscriptionSchema as ZodUpdateSubscriptionSchema
} from './zod/subscription.schemas';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateSubscriptionSchema: TypeBoxCreateSubscriptionSchema,
  UpdateSubscriptionSchema: TypeBoxUpdateSubscriptionSchema(uuidId),
  SubscriptionSchema: TypeBoxSubscriptionSchema
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateSubscriptionSchema: ZodCreateSubscriptionSchema,
  UpdateSubscriptionSchema: ZodUpdateSubscriptionSchema(uuidId),
  SubscriptionSchema: ZodSubscriptionSchema(uuidId)
});

// Type helper for return type
type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BaseSubscriptionServiceSchemas = <
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
