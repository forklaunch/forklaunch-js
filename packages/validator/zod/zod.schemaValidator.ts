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
  ZodError,
  ZodLiteral,
  ZodObject,
  ZodOptional,
  ZodRawShape,
  ZodType,
  ZodUnion,
  z
} from 'zod';
import {
  LiteralSchema,
  ParseResult,
  SchemaValidator
} from '../types/schema.types';
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
      <T extends ZodObject<ZodRawShape>>(schema: T) => ZodResolve<T>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodResolve<T>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodOptional<ZodResolve<T>>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodArray<ZodResolve<T>>,
      <T extends ZodUnionContainer>(schemas: T) => ZodUnion<UnionZodResolve<T>>,
      <T extends LiteralSchema>(value: T) => ZodLiteral<ZodResolve<T>>,
      <T extends ZodCatchall>(schema: T, value: unknown) => boolean,
      <T extends ZodCatchall>(
        schema: T,
        value: unknown
      ) => ParseResult<ZodResolve<T>>,
      <T extends ZodIdiomaticSchema>(schema: T) => SchemaObject
    >
{
  _Type!: 'Zod';
  _SchemaCatchall!: ZodType;
  _ValidSchemaObject!:
    | ZodObject<ZodRawShape>
    | ZodArray<ZodObject<ZodRawShape>>;

  string = z.coerce.string().refine((value) => value !== 'undefined', {
    message: 'String cannot be undefined'
  });
  number = z.coerce.number();
  bigint = z.coerce.bigint();
  boolean = z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean());
  date = z.coerce.date();
  symbol = z.symbol();
  empty = z.union([z.void(), z.null(), z.undefined()]);
  any = z.any();
  unknown = z.unknown();
  never = z.never();

  /**
   * Pretty print Zod errors.
   *
   * @param {ZodError} error - The Zod error to pretty print.
   * @returns
   */
  private prettyPrintZodErrors(error?: ZodError): string | undefined {
    if (!error) return;

    const errorMessages = error.errors.map((err, index) => {
      const path = err.path.length > 0 ? err.path.join(' > ') : 'root';
      return `${index + 1}. Path: ${path}\n   Message: ${err.message}`;
    });
    return `Validation failed with the following errors:\n${errorMessages.join('\n\n')}`;
  }

  /**
   * Compiles schema if this exists, for optimal performance.
   *
   * @param {ZodObject<ZodRawShape>} schema - The schema to compile.
   * @returns {ZodResolve<T>} - The compiled schema.
   */
  compile<T extends ZodObject<ZodRawShape>>(schema: T): ZodResolve<T> {
    return schema as ZodResolve<T>;
  }

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
        newSchema[key] = schema[key];
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
    } else {
      return this.schemify(schema).optional() as ZodOptional<ZodResolve<T>>;
    }
  }

  /**
   * Create an array schema.
   * @param {ZodIdiomaticSchema} schema - The schema to use for array items.
   * @returns {ZodArray<ZodResolve<T>>} The array schema.
   */
  array<T extends ZodIdiomaticSchema>(schema: T): ZodArray<ZodResolve<T>> {
    if (schema instanceof ZodType) {
      return schema.array() as ZodArray<ZodResolve<T>>;
    } else {
      return this.schemify(schema).array() as ZodArray<ZodResolve<T>>;
    }
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
   * Parses a value to a schema validation.
   *
   * @param {ZodCatchall} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {ParseResult} - The discrimintated parsed value if successful, the error if unsuccessful.
   */
  parse<T extends ZodCatchall>(
    schema: T,
    value: unknown
  ): ParseResult<ZodResolve<T>> {
    const result = schema.safeParse(value);
    return {
      ok: result.success,
      value: result.success && result.data,
      error: this.prettyPrintZodErrors(result.error)
    };
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
 * Parses a value to be conformant to a particular schema.
 */
export const parse: typeof SchemaValidator.parse =
  SchemaValidator.parse.bind(SchemaValidator);

/**
 * Generates an OpenAPI schema object from a valid schema.
 */
export const openapi: typeof SchemaValidator.openapi =
  SchemaValidator.openapi.bind(SchemaValidator);
