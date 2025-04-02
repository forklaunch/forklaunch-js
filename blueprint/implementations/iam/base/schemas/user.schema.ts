import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
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

export const BaseUserServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
