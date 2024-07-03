import { SchemaValidator } from "@forklaunch/validator/interfaces";

/**
 * Interface representing a constructor for an entity mapper.
 * 
 * @template T - The type of the entity mapper.
 * @interface EntityMapperConstructor
 */
export interface EntityMapperConstructor<T, SV extends SchemaValidator> {
    /**
     * Creates a new instance of the entity mapper.
     * 
     * @param {SchemaValidator} schemaValidator - The arguments to pass to the constructor.
     * @returns {T} - A new instance of the entity mapper.
     */
    new (schemaValidator: SV): T;
}