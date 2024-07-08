/**
 * This module provides a Zod-based schema definition.
 * It includes various types, schema creation, validation, and OpenAPI integration.
 *
 * @module ZodSchemaValidator
 */

import { generateSchema } from '@anatine/zod-openapi';
import { SchemaObject } from 'openapi3-ts/oas31';
import {
  ZodArray,
  ZodLiteral,
  ZodObject,
  ZodOptional,
  ZodRawShape,
  ZodType,
  ZodUnion,
  z
} from 'zod';
import { LiteralSchema, SchemaValidator } from '../types/schema.types';
import {
  UnionZodResolve,
  ZodCatchall,
  ZodIdiomaticSchema,
  ZodResolve,
  ZodUnionContainer
} from './types/zod.schema.types';

/**
 * Class representing a Zod schema definition.
 * @implements {SchemaValidator}
 */
export class ZodSchemaValidator
  implements
    SchemaValidator<
      <T extends ZodIdiomaticSchema>(schema: T) => ZodResolve<T>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodOptional<ZodResolve<T>>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodArray<ZodResolve<T>>,
      <T extends ZodUnionContainer>(schemas: T) => ZodUnion<UnionZodResolve<T>>,
      <T extends LiteralSchema>(value: T) => ZodLiteral<ZodResolve<T>>,
      <T extends ZodCatchall>(schema: T, value: unknown) => boolean,
      <T extends ZodIdiomaticSchema>(schema: T) => SchemaObject
    >
{
  _Type!: 'Zod';
  _SchemaCatchall!: ZodType;
  _ValidSchemaObject!:
    | ZodObject<ZodRawShape>
    | ZodArray<ZodObject<ZodRawShape>>;

  string = z.string();
  number = z.number();
  bigint = z.bigint();
  boolean = z.boolean();
  date = z.date();
  symbol = z.symbol();
  empty = z.union([z.void(), z.null(), z.undefined()]);
  any = z.any();
  unknown = z.unknown();
  never = z.never();

  /**
   * Convert a schema to a Zod schema.
   * @param {ZodIdiomaticSchema} schema - The schema to convert.
   * @returns {ZodResolve<T>} The resolved schema.
   */
  schemify<T extends ZodIdiomaticSchema>(schema: T): ZodResolve<T> {
    if (
      typeof schema === 'string' ||
      typeof schema === 'number' ||
      typeof schema === 'boolean'
    ) {
      return z.literal(schema) as ZodResolve<T>;
    }

    if (schema instanceof ZodType) {
      return schema as ZodResolve<T>;
    }

    const newSchema: ZodRawShape = {};
    Object.getOwnPropertyNames(schema).forEach((key) => {
      if (schema[key] instanceof ZodType) {
        newSchema[key] = schema[key] as unknown as ZodType;
      } else {
        newSchema[key] = this.schemify(schema[key]);
      }
    });

    return z.object(newSchema) as ZodResolve<T>;
  }

  /**
   * Make a schema optional.
   * @param {ZodIdiomaticSchema} schema - The schema to make optional.
   * @returns {ZodOptional<ZodResolve<T>>} The optional schema.
   */
  optional<T extends ZodIdiomaticSchema>(
    schema: T
  ): ZodOptional<ZodResolve<T>> {
    if (schema instanceof ZodType) {
      return schema.optional() as ZodOptional<ZodResolve<T>>;
    }
    return this.schemify(schema).optional() as ZodOptional<ZodResolve<T>>;
  }

  /**
   * Create an array schema.
   * @param {ZodIdiomaticSchema} schema - The schema to use for array items.
   * @returns {ZodArray<ZodResolve<T>>} The array schema.
   */
  array<T extends ZodIdiomaticSchema>(schema: T): ZodArray<ZodResolve<T>> {
    if (schema instanceof ZodType) {
      return schema.array() as ZodArray<ZodResolve<T>>;
    }
    return this.schemify(schema).array() as ZodArray<ZodResolve<T>>;
  }

  /**
   * Create a union schema.
   * @param {ZodUnionContainer} schemas - The schemas to union.
   * @returns {ZodUnion<UnionZodResolve<T>>} The union schema.
   */
  union<T extends ZodUnionContainer>(schemas: T): ZodUnion<UnionZodResolve<T>> {
    if (schemas.length < 2) {
      throw new Error('Union must have at least two schemas');
    }

    const unionTypes = schemas.map((schema) => {
      if (schema instanceof ZodType) {
        return schema;
      }
      return this.schemify(schema);
    });

    return z.union(
      unionTypes as unknown as [ZodType, ZodType, ...ZodType[]]
    ) as ZodUnion<UnionZodResolve<T>>;
  }

  /**
   * Create a literal schema.
   * @param {LiteralSchema} value - The literal value.
   * @returns {ZodLiteral<ZodResolve<T>>} The literal schema.
   */
  literal<T extends LiteralSchema>(value: T): ZodLiteral<ZodResolve<T>> {
    return z.literal(value) as ZodLiteral<ZodResolve<T>>;
  }

  /**
   * Validate a value against a schema.
   * @param {ZodCatchall} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {boolean} True if valid, otherwise false.
   */
  validate<T extends ZodCatchall>(schema: T, value: unknown): boolean {
    return schema.safeParse(value).success;
  }

  /**
   * Convert a schema to an OpenAPI schema object.
   * @param {ZodIdiomaticSchema} schema - The schema to convert.
   * @returns {SchemaObject} The OpenAPI schema object.
   */
  openapi<T extends ZodIdiomaticSchema>(schema: T): SchemaObject {
    return generateSchema(this.schemify(schema));
  }
}

/**
 * Factory function for creating a ZodSchemaValidator instance.
 * @returns {ZodSchemaValidator} The ZodSchemaValidator instance.
 */
export const ZodSchema = () => new ZodSchemaValidator();

const SchemaValidator = ZodSchema();

/**
 * Zod schema definition for string type.
 */
export const string: typeof SchemaValidator.string = SchemaValidator.string;

/**
 * Zod schema definition for number type.
 */
export const number: typeof SchemaValidator.number = SchemaValidator.number;

/**
 * Zod schema definition for bigint type.
 */
export const bigint: typeof SchemaValidator.bigint = SchemaValidator.bigint;

/**
 * Zod schema definition for boolean type.
 */
export const boolean: typeof SchemaValidator.boolean = SchemaValidator.boolean;

/**
 * Zod schema definition for date type.
 */
export const date: typeof SchemaValidator.date = SchemaValidator.date;

/**
 * Zod schema definition for symbol type.
 */
export const symbol: typeof SchemaValidator.symbol = SchemaValidator.symbol;

/**
 * Zod schema definition for undefined, null, void types.
 */
export const empty: typeof SchemaValidator.empty = SchemaValidator.empty;

/**
 * Zod schema definition for any type.
 */
export const any: typeof SchemaValidator.any = SchemaValidator.any;

/**
 * Zod schema definition for unknown type.
 */
export const unknown: typeof SchemaValidator.unknown = SchemaValidator.unknown;

/**
 * Zod schema definition for never type.
 */
export const never: typeof SchemaValidator.never = SchemaValidator.never;

/**
 * Transforms valid schema into Zod schema.
 */
export const schemify: typeof SchemaValidator.schemify =
  SchemaValidator.schemify.bind(SchemaValidator);

/**
 * Makes a valid schema optional.
 */
export const optional: typeof SchemaValidator.optional =
  SchemaValidator.optional.bind(SchemaValidator);

/**
 * Defines an array for a valid schema.
 */
export const array: typeof SchemaValidator.array =
  SchemaValidator.array.bind(SchemaValidator);

/**
 * Defines a union for a valid schema.
 */
export const union: typeof SchemaValidator.union =
  SchemaValidator.union.bind(SchemaValidator);

/**
 * Defines a literal for a valid schema.
 */
export const literal: typeof SchemaValidator.literal =
  SchemaValidator.literal.bind(SchemaValidator);

/**
 * Validates a value against a valid schema.
 */
export const validate: typeof SchemaValidator.validate =
  SchemaValidator.validate.bind(SchemaValidator);

/**
 * Generates an OpenAPI schema object from a valid schema.
 */
export const openapi: typeof SchemaValidator.openapi =
  SchemaValidator.openapi.bind(SchemaValidator);
