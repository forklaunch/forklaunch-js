
import { Prettify } from "@forklaunch/common";
import { SchemaObject } from "openapi3-ts/oas31";
import { TResolve, TSchemaTranslate } from "../typebox/types/typebox.schema.types";
import { ZodResolve, ZodSchemaTranslate } from "../zod/types/zod.schema.types";

/**
 * Interface representing a schema validator.
 *
 * @template UnionContainer - The type for union schemas.
 * @template IdiomaticSchema<unknown> - The type for idiomatic schemas.
 * @template Catchall - The catch-all type for all schemas.
 */
export interface SchemaValidator<
    SchematicFunction = <T>(schema: T) => unknown,
    OptionalFunction =<T>(schema: T) => unknown,
    ArrayFunction = <T>(schema: T) => unknown,
    UnionFunction = <T>(schemas: T[]) => unknown,
    LiteralFunction = <T extends LiteralSchema>(schema: T) => unknown,
    ValidationFunction = <T>(schema: T, value: unknown) => boolean,
    OpenAPIFunction = <T>(schema: T) => SchemaObject
> {
    _Type: unknown;
    _SchemaCatchall: unknown;
    _ValidSchemaObject: unknown;

    /**
     * Validator for string type.
     */
    string: unknown;

    /**
     * Validator for number type.
     */
    number: unknown;

    /**
     * Validator for bigint type.
     */
    bigint: unknown;

    /**
     * Validator for boolean type.
     */
    boolean: unknown;

    /**
     * Validator for date type.
     */
    date: unknown;

    /**
     * Validator for symbol type.
     */
    symbol: unknown;

    /**
     * Validator for empty type.
     */
    empty: unknown;

    /**
     * Validator for any type.
     */
    any: unknown;

    /**
     * Validator for unknown type.
     */
    unknown: unknown;

    /**
     * Validator for never type.
     */
    never: unknown;

    /**
     * Converts a valid schema input into a schemified form.
     *
     * @template T - The type of the idiomatic schema.
     * @param {T} schema - The schema to schemify.
     * @returns {unknown} - The schemified form of the schema.
     */
    schemify: SchematicFunction;

    /**
     * Converts a schema into an optional schema.
     *
     * @template T - The type of the idiomatic schema.
     * @param {T} schema - The schema to make optional.
     * @returns {unknown} - The optional form of the schema.
     */
    optional: OptionalFunction;

    /**
     * Converts a schema into an array schema.
     *
     * @template T - The type of the idiomatic schema.
     * @param {T} schema - The schema to convert into an array.
     * @returns {unknown} - The array form of the schema.
     */
    array: ArrayFunction;

    /**
     * Converts multiple schemas into a union schema.
     *
     * @template T - The type of the union container.
     * @param {T} schemas - The schemas to unionize.
     * @returns {unknown} - The union form of the schemas.
     */
    // union<T extends UnionContainer>(schemas: T): unknown;
    union: UnionFunction;


    /**
     * Creates a literal schema from a value.
     *
     * @template T - The type of the literal value.
     * @param {T} value - The literal value.
     * @returns {unknown} - The literal schema.
     */
    literal: LiteralFunction;

    /**
     * Validates a value against a schema.
     *
     * @template T - The type of the catch-all schema.
     * @param {T} schema - The schema to validate against.
     * @param {unknown} value - The value to validate.
     * @returns {boolean} - Whether the value is valid according to the schema.
     */
    validate: ValidationFunction;

    /**
     * Converts a schema into an OpenAPI schema object.
     *
     * @template T - The type of the idiomatic schema.
     * @param {T} schema - The schema to convert.
     * @returns {SchemaObject} - The OpenAPI schema object.
     */
    openapi: OpenAPIFunction;
}

export type AnySchemaValidator = SchemaValidator<unknown, unknown, unknown, unknown, unknown, unknown, unknown>;

interface SchemaResolve<T> {
    Zod: ZodResolve<T>,
    TypeBox: TResolve<T>
}

interface SchemaTranslate<T> {
    Zod: ZodSchemaTranslate<T>;
    TypeBox: TSchemaTranslate<T>;
}  

type SchemaPrettify<T, SV extends AnySchemaValidator> = SV['_Type'] extends keyof SchemaTranslate<T> ? Prettify<SchemaTranslate<T>[SV['_Type']]> : never;

export type Schema<T extends SV['_ValidSchemaObject'] | IdiomaticSchema<SV>, SV extends AnySchemaValidator> = SV['_Type'] extends keyof SchemaResolve<T> ?
  SchemaPrettify<SchemaResolve<T>[SV['_Type']], SV>
  : never;


/**
 * Represents a schema for an unboxed object where each key can have an idiomatic schema.
 * 
 * @template Catchall - The type to use for catch-all cases in the schema.
 */
export type UnboxedObjectSchema<SV extends AnySchemaValidator> = {
    [key: KeyTypes]: IdiomaticSchema<SV>;
};

/**
 * Represents a schema that can be a literal value.
 */
export type LiteralSchema = string | number | boolean;

/**
 * Represents an idiomatic schema which can be an unboxed object schema, a literal schema, or a catch-all type.
 * 
 * @template Catchall - The type to use for catch-all cases in the schema.
 */
export type IdiomaticSchema<SV extends AnySchemaValidator> = UnboxedObjectSchema<SV> | LiteralSchema | SV['_SchemaCatchall'];

/**
 * Increments a number type by one, with support up to 50.
 * 
 * @template T - The number type to increment.
 */
export type Increment<T extends number> = 
    T extends 0 ? 1 :
    T extends 1 ? 2 :
    T extends 2 ? 3 :
    T extends 3 ? 4 :
    T extends 4 ? 5 :
    T extends 5 ? 6 :
    T extends 6 ? 7 :
    T extends 7 ? 8 :
    T extends 8 ? 9 :
    T extends 9 ? 10 :
    T extends 10 ? 11 :
    T extends 11 ? 12 :
    T extends 12 ? 13 :
    T extends 13 ? 14 :
    T extends 14 ? 15 :
    T extends 15 ? 16 :
    T extends 16 ? 17 :
    T extends 17 ? 18 :
    T extends 18 ? 19 :
    T extends 19 ? 20 :
    T extends 20 ? 21 :
    T extends 21 ? 22 :
    T extends 22 ? 23 :
    T extends 23 ? 24 :
    T extends 24 ? 25 :
    T extends 25 ? 26 :
    T extends 26 ? 27 :
    T extends 27 ? 28 :
    T extends 28 ? 29 :
    T extends 29 ? 30 :
    T extends 30 ? 31 :
    T extends 31 ? 32 :
    T extends 32 ? 33 :
    T extends 33 ? 34 :
    T extends 34 ? 35 :
    T extends 35 ? 36 :
    T extends 36 ? 37 :
    T extends 37 ? 38 :
    T extends 38 ? 39 :
    T extends 39 ? 40 :
    T extends 40 ? 41 :
    T extends 41 ? 42 :
    T extends 42 ? 43 :
    T extends 43 ? 44 :
    T extends 44 ? 45 :
    T extends 45 ? 46 :
    T extends 46 ? 47 :
    T extends 47 ? 48 :
    T extends 48 ? 49 :
    T extends 49 ? 50 :
    50;

/**
 * Represents key types that can be used in the schema.
 */
export type KeyTypes = string | number;
