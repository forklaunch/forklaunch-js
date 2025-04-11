import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { BaseRoleServiceSchemas as TypeBoxSchemas } from './typebox/role.schema';
import { BaseRoleServiceSchemas as ZodSchemas } from './zod/role.schema';

export const BaseRoleServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
