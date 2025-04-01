import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  CreateOrganizationSchema as TypeBoxCreateOrganizationSchema,
  OrganizationSchema as TypeBoxOrganizationSchema,
  UpdateOrganizationSchema as TypeBoxUpdateOrganizationSchema
} from './typebox/organization.schema';
import {
  CreateOrganizationSchema as ZodCreateOrganizationSchema,
  OrganizationSchema as ZodOrganizationSchema,
  UpdateOrganizationSchema as ZodUpdateOrganizationSchema
} from './zod/organization.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateOrganizationSchema: TypeBoxCreateOrganizationSchema,
  UpdateOrganizationSchema: TypeBoxUpdateOrganizationSchema(uuidId),
  OrganizationSchema: TypeBoxOrganizationSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateOrganizationSchema: ZodCreateOrganizationSchema,
  UpdateOrganizationSchema: ZodUpdateOrganizationSchema(uuidId),
  OrganizationSchema: ZodOrganizationSchema(uuidId)
});

type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BaseOrganizationServiceSchemas = <
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
