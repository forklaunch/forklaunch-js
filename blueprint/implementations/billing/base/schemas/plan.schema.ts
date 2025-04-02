import { serviceSchemaResolver } from '@forklaunch/core/dtoMapper';
import {
  CreatePlanSchema as TypeBoxCreatePlanSchema,
  PlanSchema as TypeBoxPlanSchema,
  UpdatePlanSchema as TypeBoxUpdatePlanSchema
} from './typebox/plan.schema';
import {
  CreatePlanSchema as ZodCreatePlanSchema,
  PlanSchema as ZodPlanSchema,
  UpdatePlanSchema as ZodUpdatePlanSchema
} from './zod/plan.schema';

const TypeBoxSchemas = (uuidId: boolean) => ({
  CreatePlanSchema: TypeBoxCreatePlanSchema,
  UpdatePlanSchema: TypeBoxUpdatePlanSchema(uuidId),
  PlanSchema: TypeBoxPlanSchema(uuidId)
});

const ZodSchemas = (uuidId: boolean) => ({
  CreatePlanSchema: ZodCreatePlanSchema,
  UpdatePlanSchema: ZodUpdatePlanSchema(uuidId),
  PlanSchema: ZodPlanSchema(uuidId)
});

export const BasePlanServiceSchemas = serviceSchemaResolver(
  TypeBoxSchemas,
  ZodSchemas
);
