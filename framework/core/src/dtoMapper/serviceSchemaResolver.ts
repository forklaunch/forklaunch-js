import { isNever } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { SchemasByValidator } from './types/serviceSchemaResolver.types';

export function serviceSchemaResolver<
  Options extends Record<string, unknown>,
  TypeBoxSchemas,
  ZodSchemas
>(
  TypeBoxSchemas: (options: Options) => TypeBoxSchemas,
  ZodSchemas: (options: Options) => ZodSchemas
) {
  return <SchemaValidator extends AnySchemaValidator>(
    options: Options & { validator: SchemaValidator }
  ): SchemasByValidator<
    SchemaValidator,
    (options: Options) => TypeBoxSchemas,
    (options: Options) => ZodSchemas
  > => {
    switch (options.validator._Type) {
      case 'TypeBox':
        return TypeBoxSchemas(options) as SchemasByValidator<
          SchemaValidator,
          (options: Options) => TypeBoxSchemas,
          (options: Options) => ZodSchemas
        >;
      case 'Zod':
        return ZodSchemas(options) as SchemasByValidator<
          SchemaValidator,
          (options: Options) => TypeBoxSchemas,
          (options: Options) => ZodSchemas
        >;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      case 'Mock':
        throw new Error('Mock schema validator not supported');
      default:
        isNever(options.validator._Type);
        throw new Error('Invalid schema validator');
    }
  };
}
