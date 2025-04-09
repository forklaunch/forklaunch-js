import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import { BasePlanSchemas as TypeBoxSchemas } from './typebox/plan.schema';
import { BasePlanSchemas as ZodSchemas } from './zod/plan.schema';

export const BasePlanServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
