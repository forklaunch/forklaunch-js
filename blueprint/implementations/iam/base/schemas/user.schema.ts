import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  CreateUserSchema as TypeBoxCreateUserSchema,
  UpdateUserSchema as TypeBoxUpdateUserSchema,
  UserSchema as TypeBoxUserSchema
} from './typebox/user.schema';
import {
  CreateUserSchema as ZodCreateUserSchema,
  UpdateUserSchema as ZodUpdateUserSchema,
  UserSchema as ZodUserSchema
} from './zod/user.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreateUserSchema: TypeBoxCreateUserSchema,
  UpdateUserSchema: TypeBoxUpdateUserSchema(uuidId),
  UserSchema: TypeBoxUserSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreateUserSchema: ZodCreateUserSchema,
  UpdateUserSchema: ZodUpdateUserSchema(uuidId),
  UserSchema: ZodUserSchema(uuidId)
});

type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BaseUserServiceSchemas = <
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
