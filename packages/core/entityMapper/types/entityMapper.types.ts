import { Schema, SchemaCatchall, ValidSchemaObject } from "@forklaunch/validator/";
import { SchemaValidator } from "@forklaunch/validator/interfaces";
import { UnboxedObjectSchema } from "@forklaunch/validator/types";
import { BaseEntityMapper } from "../models/baseEntityMapper.model";

/**
 * Type representing a schema validator object for an entity mapper.
 * 
 * @template SV - A type that extends SchemaValidator.
 * @typedef {ValidSchemaObject<SV> | UnboxedObjectSchema<SchemaCatchall<SV>> & {}} EntityMapperSchemaValidatorObject
 */
export type EntityMapperSchemaValidatorObject<SV extends SchemaValidator> = ValidSchemaObject<SV> | UnboxedObjectSchema<SchemaCatchall<SV>>;

/**
 * Type representing the static schema of an entity mapper.
 * 
 * @template T - A type that extends BaseEntityMapper with a schema property.
 * @typedef {Schema<T['schema'], T['_SV']> & {}} EntityMapperStaticSchema
 */
export type EntityMapperStaticSchema<T extends BaseEntityMapper<any> & { schema: any }> = Schema<T['schema'], T['_SV']>;

/**
 * Type representing the schema of an entity mapper.
 * 
 * @template T - A type that extends ValidSchemaObject or UnboxedObjectSchema with SchemaCatchall.
 * @template SV - A type that extends SchemaValidator.
 * @typedef {Schema<T, SV> & {}} EntityMapperSchema
 */
export type EntityMapperSchema<T extends ValidSchemaObject<SV> | UnboxedObjectSchema<SchemaCatchall<SV>>, SV extends SchemaValidator> = Schema<T, SV>;
