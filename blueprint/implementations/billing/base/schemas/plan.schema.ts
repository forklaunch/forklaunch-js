import { serviceSchemaResolver } from '@forklaunch/internal';
import { BasePlanServiceSchemas as TypeBoxSchemas } from './typebox/plan.schema';
import { BasePlanServiceSchemas as ZodSchemas } from './zod/plan.schema';

export const BasePlanServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
