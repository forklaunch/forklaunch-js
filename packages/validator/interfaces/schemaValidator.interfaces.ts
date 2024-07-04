import { SchemaObject } from "openapi3-ts/oas31";
import { LiteralSchema } from "../types/schema.types";

/**
 * Interface representing a schema validator.
 *
 * @template UnionContainer - The type for union schemas.
 * @template IdiomaticSchema - The type for idiomatic schemas.
 * @template Catchall - The catch-all type for all schemas.
 */
export interface SchemaValidator<
    UnionContainer = unknown, 
    IdiomaticSchema = unknown,
    Catchall = unknown
> {
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
    schemify<T extends IdiomaticSchema>(schema: T): unknown;

    /**
     * Converts a schema into an optional schema.
     *
     * @template T - The type of the idiomatic schema.
     * @param {T} schema - The schema to make optional.
     * @returns {unknown} - The optional form of the schema.
     */
    optional<T extends IdiomaticSchema>(schema: T): unknown;

    /**
     * Converts a schema into an array schema.
     *
     * @template T - The type of the idiomatic schema.
     * @param {T} schema - The schema to convert into an array.
     * @returns {unknown} - The array form of the schema.
     */
    array<T extends IdiomaticSchema>(schema: T): unknown;

    /**
     * Converts multiple schemas into a union schema.
     *
     * @template T - The type of the union container.
     * @param {T} schemas - The schemas to unionize.
     * @returns {unknown} - The union form of the schemas.
     */
    union<T extends UnionContainer>(schemas: T): unknown;

    /**
     * Creates a literal schema from a value.
     *
     * @template T - The type of the literal value.
     * @param {T} value - The literal value.
     * @returns {unknown} - The literal schema.
     */
    literal<T extends LiteralSchema>(value: T): unknown;

    /**
     * Validates a value against a schema.
     *
     * @template T - The type of the catch-all schema.
     * @param {T} schema - The schema to validate against.
     * @param {unknown} value - The value to validate.
     * @returns {boolean} - Whether the value is valid according to the schema.
     */
    validate<T extends Catchall>(schema: T, value: unknown): boolean;

    /**
     * Converts a schema into an OpenAPI schema object.
     *
     * @template T - The type of the idiomatic schema.
     * @param {T} schema - The schema to convert.
     * @returns {SchemaObject} - The OpenAPI schema object.
     */
    openapi<T extends IdiomaticSchema>(schema: T): SchemaObject;
}
