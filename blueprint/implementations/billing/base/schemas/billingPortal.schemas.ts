import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  BillingPortalSchema as TypeBoxBillingPortalSchema,
  CreateBillingPortalSchema as TypeBoxCreateBillingPortalSchema,
  UpdateBillingPortalSchema as TypeBoxUpdateBillingPortalSchema
} from './typebox/billingPortal.schemas';
import {
  BillingPortalSchema as ZodBillingPortalSchema,
  CreateBillingPortalSchema as ZodCreateBillingPortalSchema,
  UpdateBillingPortalSchema as ZodUpdateBillingPortalSchema
} from './zod/billingPortal.schemas';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateBillingPortalSchema: TypeBoxCreateBillingPortalSchema,
  UpdateBillingPortalSchema: TypeBoxUpdateBillingPortalSchema(uuidId),
  BillingPortalSchema: TypeBoxBillingPortalSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateBillingPortalSchema: ZodCreateBillingPortalSchema,
  UpdateBillingPortalSchema: ZodUpdateBillingPortalSchema(uuidId),
  BillingPortalSchema: ZodBillingPortalSchema(uuidId)
});

type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BaseBillingPortalServiceSchemas = <
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
