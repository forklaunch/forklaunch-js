/**
 * This module provides type definitions and utilities for working with schemas using Zod and TypeBox.
 * It includes type mappings and transformations for schema objects, arrays, and resolutions.
 * 
 * @module SchemaTypes
 */

import { Prettify } from "@forklaunch/common";
import { TypeboxSchemaValidator } from "./typebox";
import { TCatchall, TObject, TObjectShape, TOuterArray, TResolve, TSchemaTranslate } from "./typebox/types/typebox.schema.types";
import { IdiomaticSchema } from "./types/schema.types";
import { ZodSchemaValidator } from "./zod";
import { ZodCatchall, ZodObject, ZodObjectShape, ZodOuterArray, ZodResolve, ZodSchemaTranslate } from "./zod/types/zod.schema.types";

/**
 * Interface representing any schema validator.
 * Extends the SchemaValidator interface with any schema types.
 */
export type AnySchemaValidator = TypeboxSchemaValidator | ZodSchemaValidator;

/**
 * Type alias for a schema object shape.
 * Resolves to ZodObjectShape for Zod schemas and TObjectShape for TypeBox schemas.
 * 
 * @template SV - SchemaValidator type.
 */
type SchemaObjectShape<SV extends AnySchemaValidator> = (
  SV extends ZodSchemaValidator ? ZodObjectShape :
  SV extends TypeboxSchemaValidator ? TObjectShape :
  never
);

/**
 * Type alias for a schema object.
 * Resolves to ZodObject for Zod schemas and TObject for TypeBox schemas.
 * 
 * @template T - Schema object shape.
 * @template SV - SchemaValidator type.
 */
type SchemaObject<T extends SchemaObjectShape<SV>, SV extends AnySchemaValidator> = (
  SV extends ZodSchemaValidator ? ZodObject<T> :
  SV extends TypeboxSchemaValidator ? TObject<T> :
  never
);

/**
 * Type alias for a schema outer array.
 * Resolves to ZodOuterArray for Zod schemas and TOuterArray for TypeBox schemas.
 * 
 * @template T - Schema object.
 * @template SV - SchemaValidator type.
 */
type SchemaOuterArray<T extends SchemaObject<SchemaObjectShape<SV>, SV>, SV extends AnySchemaValidator> = (
  SV extends ZodSchemaValidator ? ZodOuterArray<T> :
  SV extends TypeboxSchemaValidator ? TOuterArray<T> :
  never
);

/**
 * Type alias for resolving a schema.
 * Resolves to ZodResolve for Zod schemas and TResolve for TypeBox schemas.
 * 
 * @template T - Schema type.
 * @template SV - SchemaValidator type.
 */
type SchemaResolve<T, SV extends AnySchemaValidator> = (
  SV extends ZodSchemaValidator ? ZodResolve<T> :
  SV extends TypeboxSchemaValidator ? TResolve<T> :
  never
);

/**
 * Type alias for translating a schema.
 * Resolves to ZodSchemaTranslate for Zod schemas and TSchemaTranslate for TypeBox schemas.
 * 
 * @template T - Schema type.
 * @template SV - SchemaValidator type.
 */
type SchemaTranslate<T, SV extends AnySchemaValidator> = (
  SV extends ZodSchemaValidator ? ZodSchemaTranslate<T> :
  SV extends TypeboxSchemaValidator ? TSchemaTranslate<T> :
  never
);

/**
 * Type alias for prettifying a schema translation.
 * Uses the Prettify utility from @forklaunch/common.
 * 
 * @template T - Schema type.
 * @template SV - SchemaValidator type.
 */
type SchemaPrettify<T, SV extends AnySchemaValidator> = Prettify<SchemaTranslate<T, SV>>;

/**
 * Type alias for a schema catchall type.
 * Resolves to ZodCatchall for Zod schemas and TCatchall for TypeBox schemas.
 * 
 * @template SV - SchemaValidator type.
 */
export type SchemaCatchall<SV extends AnySchemaValidator> = (
  SV extends ZodSchemaValidator ? ZodCatchall : 
  SV extends TypeboxSchemaValidator ? TCatchall : 
  never
);

/**
 * Type alias for a valid schema object.
 * Can be a schema object or a schema outer array.
 * 
 * @template SV - SchemaValidator type.
 */
export type ValidSchemaObject<SV extends AnySchemaValidator> = SchemaObject<SchemaObjectShape<SV>, SV> | SchemaOuterArray<SchemaObject<SchemaObjectShape<SV>, SV>, SV>;

/**
 * Type alias for a schema.
 * Applies prettification to the resolved schema.
 * 
 * @template T - Valid schema object or idiomatic schema.
 * @template SV - SchemaValidator type.
 */
export type Schema<T extends ValidSchemaObject<SV> | IdiomaticSchema<SchemaCatchall<SV>>, SV extends AnySchemaValidator> = SchemaPrettify<SchemaResolve<T, SV>, SV>;

export * from "./interfaces";
