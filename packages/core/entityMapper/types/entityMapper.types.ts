import { AnySchemaValidator } from '@forklaunch/validator';
import { UnboxedObjectSchema } from '@forklaunch/validator/types';

/**
 * Type representing a schema validator object for an entity mapper.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @typedef {SV['_ValidSchemaObject'] | UnboxedObjectSchema<SV>} EntityMapperSchemaValidatorObject
 */
export type EntityMapperSchemaValidatorObject<SV extends AnySchemaValidator> =
  | SV['_ValidSchemaObject']
  | UnboxedObjectSchema<SV>;
