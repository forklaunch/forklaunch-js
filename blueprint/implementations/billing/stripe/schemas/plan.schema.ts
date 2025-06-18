import { serviceSchemaResolver } from '@forklaunch/core/mappers';
import { BasePlanServiceSchemas as TypeBoxSchemas } from './typebox/plan.schema';
import { BasePlanServiceSchemas as ZodSchemas } from './zod/plan.schema';

export const BasePlanServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
