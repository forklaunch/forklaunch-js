import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { SchemasByValidator } from './types/serviceSchemaResolver.types';

export function serviceSchemaResolver<
  TypeBoxSchemas extends (uuidId: boolean) => unknown,
  ZodSchemas extends (uuidId: boolean) => unknown
>(TypeBoxSchemas: TypeBoxSchemas, ZodSchemas: ZodSchemas) {
  return <SchemaValidator extends AnySchemaValidator>(
    schemaValidator: SchemaValidator,
    uuidId: boolean
  ): SchemasByValidator<SchemaValidator, TypeBoxSchemas, ZodSchemas> => {
    switch (schemaValidator._Type) {
      case 'TypeBox':
        return TypeBoxSchemas(uuidId) as SchemasByValidator<
          SchemaValidator,
          TypeBoxSchemas,
          ZodSchemas
        >;
      case 'Zod':
        return ZodSchemas(uuidId) as SchemasByValidator<
          SchemaValidator,
          TypeBoxSchemas,
          ZodSchemas
        >;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      case 'Mock':
        throw new Error('Mock schema validator not supported');
      default:
        isNever(schemaValidator._Type);
        throw new Error('Invalid schema validator');
    }
  };
}
