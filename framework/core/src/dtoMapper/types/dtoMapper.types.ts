import { AnySchemaValidator, UnboxedObjectSchema } from '@forklaunch/validator';

/**
 * Type representing a schema validator object for an entity mapper.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @typedef {SV['_ValidSchemaObject'] | UnboxedObjectSchema<SV>} DtoMapperSchemaValidatorObject
 */
export type DtoMapperSchemaValidatorObject<SV extends AnySchemaValidator> =
  | SV['_ValidSchemaObject']
  | UnboxedObjectSchema<SV>;
