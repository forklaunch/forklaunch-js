import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
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

export const BaseRoleServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
