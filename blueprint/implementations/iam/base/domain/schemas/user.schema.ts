import { serviceSchemaResolver } from '@forklaunch/internal';
import { BaseUserServiceSchemas as TypeBoxSchemas } from './typebox/user.schema';
import { BaseUserServiceSchemas as ZodSchemas } from './zod/user.schema';

export const BaseUserServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
