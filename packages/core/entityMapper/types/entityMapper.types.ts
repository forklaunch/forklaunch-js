import { AnySchemaValidator } from '@forklaunch/validator';
import { UnboxedObjectSchema } from '@forklaunch/validator/types';

/**
 * Type representing a schema validator object for an entity mapper.
 *
 * @template SV - A type that extends SchemaValidator.
 * @typedef {ValidSchemaObject<SV> | UnboxedObjectSchema<SchemaCatchall<SV>> & {}} EntityMapperSchemaValidatorObject
 */
export type EntityMapperSchemaValidatorObject<SV extends AnySchemaValidator> =
  | SV['_ValidSchemaObject']
  | UnboxedObjectSchema<SV>;
