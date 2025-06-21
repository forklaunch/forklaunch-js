import { serviceSchemaResolver } from '@forklaunch/internal';
import { BasePermissionServiceSchemas as TypeBoxSchemas } from './typebox/permission.schema';
import { BasePermissionServiceSchemas as ZodSchemas } from './zod/permission.schema';

export const BasePermissionServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
