import { serviceSchemaResolver } from '@forklaunch/internal';
import { StripePlanServiceSchemas as TypeBoxSchemas } from './typebox/plan.schema';
import { StripePlanServiceSchemas as ZodSchemas } from './zod/plan.schema';

export const StripePlanServiceSchemas = serviceSchemaResolver(
  () => TypeBoxSchemas,
  () => ZodSchemas
);
