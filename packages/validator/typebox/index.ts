/**
 * This module provides a TypeScript-based schema definition using the TypeBox library.
 * It includes various types, schema creation, validation, and OpenAPI integration.
 * 
 * @module TypeboxSchemaValidator
 */

import { Kind, TArray, TLiteral, TOptional, TSchema, TUnion, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { SchemaObject } from 'openapi3-ts/oas31';
import { SchemaValidator } from '../interfaces/schemaValidator.interfaces';
import { LiteralSchema } from '../types/schema.types';
import { TIdiomaticSchema, TResolve, TUnionContainer, UnionTResolve } from './types/typebox.schema.types';

/**
 * Class representing a TypeBox schema definition.
 * @implements {SchemaValidator}
 */
export class TypeboxSchemaValidator implements SchemaValidator<
    TUnionContainer,
    TIdiomaticSchema,
    TSchema
> {
    string = Type.String();
    number = Type.Number();
    bigint = Type.BigInt();
    boolean = Type.Boolean();
    date = Type.Date();
    symbol = Type.Symbol();
    empty = Type.Union([Type.Void(), Type.Null(), Type.Undefined()]);
    any = Type.Any();
    unknown = Type.Unknown();
    never = Type.Never();

    /**
     * Convert a schema to a TypeBox schema.
     * @param {TIdiomaticSchema} schema - The schema to convert.
     * @returns {TResolve<T>} The resolved schema.
     */
    schemify<T extends TIdiomaticSchema>(schema: T): TResolve<T> {
        if (typeof schema === 'string' || typeof schema === 'number' || typeof schema === 'boolean') {
            return Type.Literal(schema) as TResolve<T>;
        }

        if (Kind in (schema as TSchema)) {
            return schema as TResolve<T>;
        }
        
        const newSchema: {
            [key: string]: TSchema;
        } = {};
        Object.getOwnPropertyNames(schema).forEach((key) => {
            if (typeof schema[key] === 'object' && Kind in (schema[key] as TSchema)) {
                newSchema[key] = schema[key] as TSchema;
            } else {
                const scheme = this.schemify(schema[key]);
                newSchema[key] = scheme;
            }
        });
        
        return Type.Object(newSchema) as TResolve<T>;
    }

    /**
     * Make a schema optional.
     * @param {TIdiomaticSchema} schema - The schema to make optional.
     * @returns {TOptional<TResolve<T>>} The optional schema.
     */
    optional<T extends TIdiomaticSchema>(schema: T): TOptional<TResolve<T>> {
        if (Kind in (schema as TSchema)) {
            return Type.Optional(schema as TSchema) as TOptional<TResolve<T>>;
        }
        const scheme = this.schemify(schema);
        return Type.Optional(scheme) as TOptional<TResolve<T>>; 
    }

    /**
     * Create an array schema.
     * @param {TIdiomaticSchema} schema - The schema to use for array items.
     * @returns {TArray<TResolve<T>>} The array schema.
     */
    array<T extends TIdiomaticSchema>(schema: T): TArray<TResolve<T>> {
        if (Kind in (schema as TSchema)) {
            return Type.Array(schema as TSchema) as TArray<TResolve<T>>;
        }
        const scheme = this.schemify(schema);
        return Type.Array(scheme) as TArray<TResolve<T>>;
    }

    /**
     * Create a union schema.
     * @param {TUnionContainer} schemas - The schemas to union.
     * @returns {TUnion<UnionTResolve<T>>} The union schema.
     * 
     * WARNING: If "empty" or TUndefined is included in the union, the key will still be expected.
     * This is a limitation of TypeBox. Consider using "optional" instead.
     */
    union<T extends TUnionContainer>(schemas: T): TUnion<UnionTResolve<T>> {        
        const unionTypes = schemas.map((schema) => {
            if (Kind in (schema as TSchema)) {
                return schema as TSchema;
            }
            return this.schemify(schema);
        });

        return Type.Union(unionTypes) as TUnion<UnionTResolve<T>>;
    }

    /**
     * Create a literal schema.
     * @param {LiteralSchema} value - The literal value.
     * @returns {TLiteral<T>} The literal schema.
     */
    literal<T extends LiteralSchema>(value: T): TLiteral<T> {
        return Type.Literal(value);
    }

    /**
     * Validate a value against a schema.
     * @param {TSchema} schema - The schema to validate against.
     * @param {unknown} value - The value to validate.
     * @returns {boolean} True if valid, otherwise false.
     */
    validate<T extends TSchema>(schema: T, value: unknown): boolean {
        return Value.Check(schema, value);
    }

    /**
     * Convert a schema to an OpenAPI schema object.
     * @param {TIdiomaticSchema | TSchema} schema - The schema to convert.
     * @returns {SchemaObject} The OpenAPI schema object.
     */
    openapi<T extends TIdiomaticSchema | TSchema>(schema: T): SchemaObject {
        return this.schemify(schema);
    }
}

/**
 * Factory function for creating a TypeboxSchemaValidator instance.
 * @returns {TypeboxSchemaValidator} The TypeboxSchemaValidator instance.
 */
export const TypeboxSchema = () => new TypeboxSchemaValidator();

const SchemaValidator = TypeboxSchema();

/**
 * TypeBox schema definition for string type.
 */
export const string: typeof SchemaValidator.string = SchemaValidator.string;

/**
 * TypeBox schema definition for number type.
 */
export const number: typeof SchemaValidator.number = SchemaValidator.number;

/**
 * TypeBox schema definition for bigint type.
 */
export const bigint: typeof SchemaValidator.bigint = SchemaValidator.bigint;

/**
 * TypeBox schema definition for boolean type.
 */
export const boolean: typeof SchemaValidator.boolean = SchemaValidator.boolean;

/**
 * TypeBox schema definition for date type.
 */
export const date: typeof SchemaValidator.date = SchemaValidator.date;

/**
 * TypeBox schema definition for symbol type.
 */
export const symbol: typeof SchemaValidator.symbol = SchemaValidator.symbol;

/**
 * TypeBox schema definition for undefined, null, void types.
 */
export const empty: typeof SchemaValidator.empty = SchemaValidator.empty;

/**
 * TypeBox schema definition for any type.
 */
export const any: typeof SchemaValidator.any = SchemaValidator.any;

/**
 * TypeBox schema definition for unknown type.
 */
export const unknown: typeof SchemaValidator.unknown = SchemaValidator.unknown;

/**
 * TypeBox schema definition for never type.
 */
export const never: typeof SchemaValidator.never = SchemaValidator.never;

/**
 * Transforms valid schema into TypeBox schema.
 */
export const schemify: typeof SchemaValidator.schemify = SchemaValidator.schemify.bind(SchemaValidator);

/**
 * Makes a valid schema optional.
 */
export const optional: typeof SchemaValidator.optional = SchemaValidator.optional.bind(SchemaValidator);

/**
 * Defines an array for a valid schema.
 */
export const array: typeof SchemaValidator.array = SchemaValidator.array.bind(SchemaValidator);

/**
 * Defines a union for a valid schema.
 */
export const union: typeof SchemaValidator.union = SchemaValidator.union.bind(SchemaValidator);

/**
 * Defines a literal for a valid schema.
 */
export const literal: typeof SchemaValidator.literal = SchemaValidator.literal.bind(SchemaValidator);

/**
 * Validates a value against a valid schema.
 */
export const validate: typeof SchemaValidator.validate = SchemaValidator.validate.bind(SchemaValidator);

/**
 * Generates an OpenAPI schema object from a valid schema.
 */
export const openapi: typeof SchemaValidator.openapi = SchemaValidator.openapi.bind(SchemaValidator);