import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';
import {
  CreatePlanSchema as TypeBoxCreatePlanSchema,
  PlanSchema as TypeBoxPlanSchema,
  UpdatePlanSchema as TypeBoxUpdatePlanSchema
} from './typebox/plan.schemas';
import {
  CreatePlanSchema as ZodCreatePlanSchema,
  PlanSchema as ZodPlanSchema,
  UpdatePlanSchema as ZodUpdatePlanSchema
} from './zod/plan.schemas';

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

// Type helper for return type
type SchemasByValidator<T extends AnySchemaValidator> =
  T extends TypeboxSchemaValidator
    ? ReturnType<typeof TypeBoxSchemas>
    : T extends ZodSchemaValidator
      ? ReturnType<typeof ZodSchemas>
      : never;

export const BasePlanServiceSchemas = <
  SchemaValidator extends AnySchemaValidator
>(
  schemaValidator: SchemaValidator,
  uuidId: boolean
): SchemasByValidator<SchemaValidator> => {
  switch (schemaValidator._Type) {
    case 'TypeBox':
      return TypeBoxSchemas(uuidId) as SchemasByValidator<SchemaValidator>;

    case 'Zod':
      return ZodSchemas(uuidId) as SchemasByValidator<SchemaValidator>;

    default:
      isNever(schemaValidator._Type);
      throw new Error('Invalid schema validator');
  }
};
