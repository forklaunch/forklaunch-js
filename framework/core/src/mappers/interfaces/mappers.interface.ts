import { AnySchemaValidator } from '@forklaunch/validator';

/**
 * Interface representing a constructor for an entity mapper.
 *
 * @template T - The type of the entity mapper.
 * @template SV - The type of the schema validator.
 * @interface DtoMapperConstructor
 */
export interface DtoMapperConstructor<T, SV extends AnySchemaValidator> {
  /**
   * Creates a new instance of the entity mapper.
   *
   * @param {AnySchemaValidator} schemaValidator - The arguments to pass to the constructor.
   * @returns {T} - A new instance of the entity mapper.
   */
  new (schemaValidator: SV): T;
}
