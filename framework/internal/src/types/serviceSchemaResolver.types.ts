import { AnySchemaValidator } from '@forklaunch/validator';
import { TypeboxSchemaValidator } from '@forklaunch/validator/typebox';
import { ZodSchemaValidator } from '@forklaunch/validator/zod';

export type SchemasByValidator<
  T extends AnySchemaValidator,
  TypeBoxSchemas extends (...args: never[]) => unknown,
  ZodSchemas extends (...args: never[]) => unknown
> = T extends TypeboxSchemaValidator
  ? ReturnType<TypeBoxSchemas>
  : T extends ZodSchemaValidator
    ? ReturnType<ZodSchemas>
    : never;
