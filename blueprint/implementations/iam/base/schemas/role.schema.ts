import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  CreateRoleSchema as TypeBoxCreateRoleSchema,
  RoleSchema as TypeBoxRoleSchema,
  UpdateRoleSchema as TypeBoxUpdateRoleSchema
} from './typebox/role.schema';
import {
  CreateRoleSchema as ZodCreateRoleSchema,
  RoleSchema as ZodRoleSchema,
  UpdateRoleSchema as ZodUpdateRoleSchema
} from './zod/role.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateRoleSchema: TypeBoxCreateRoleSchema,
  UpdateRoleSchema: TypeBoxUpdateRoleSchema(uuidId),
  RoleSchema: TypeBoxRoleSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateRoleSchema: ZodCreateRoleSchema,
  UpdateRoleSchema: ZodUpdateRoleSchema(uuidId),
  RoleSchema: ZodRoleSchema(uuidId)
});

type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BaseRoleServiceSchemas = <
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
