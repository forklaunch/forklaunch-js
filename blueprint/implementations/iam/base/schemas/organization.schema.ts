import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BaseOrganizationServiceSchemas as TypeBoxSchemas } from './typebox/organization.schema';
import { BaseOrganizationServiceSchemas as ZodSchemas } from './zod/organization.schema';

export const BaseOrganizationServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
