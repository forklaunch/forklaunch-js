import { serviceSchemaResolver } from '@forklaunch/internal';
import { BaseRoleServiceSchemas as TypeBoxSchemas } from './typebox/role.schema';
import { BaseRoleServiceSchemas as ZodSchemas } from './zod/role.schema';

export const BaseRoleServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
