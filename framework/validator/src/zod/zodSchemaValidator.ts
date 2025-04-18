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
import {
  LiteralSchema,
  ParseResult,
  SchemaValidator as SV
} from '../shared/types/schema.types';
import {
  UnionZodResolve,
  ZodCatchall,
  ZodIdiomaticSchema,
  ZodResolve,
  ZodUnionContainer
} from './types/schema.types';

/**
 * Class representing a Zod schema definition.
 * @implements {StaticSchemaValidator}
 */
export class ZodSchemaValidator
  implements
    SV<
      <T extends ZodObject<ZodRawShape>>(schema: T) => ZodResolve<T>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodResolve<T>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodOptional<ZodResolve<T>>,
      <T extends ZodIdiomaticSchema>(schema: T) => ZodArray<ZodResolve<T>>,
      <T extends ZodUnionContainer>(schemas: T) => ZodUnion<UnionZodResolve<T>>,
      <T extends LiteralSchema>(value: T) => ZodLiteral<ZodResolve<T>>,
      <T extends Record<string, LiteralSchema>>(
        schemaEnum: T
      ) => ZodUnion<
        [
          {
            [K in keyof T]: ZodLiteral<T[K]>;
          }[keyof T]
        ]
      >,
      (value: unknown) => value is ZodType,
      <T extends ZodIdiomaticSchema | ZodCatchall>(
        schema: T,
        value: unknown
      ) => boolean,
      <T extends ZodIdiomaticSchema | ZodCatchall>(
        schema: T,
        value: unknown
      ) => ParseResult<ZodResolve<T>>,
      <T extends ZodIdiomaticSchema | ZodCatchall>(schema: T) => SchemaObject
    >
{
  _Type = 'Zod' as const;
  _SchemaCatchall!: ZodType;
  _ValidSchemaObject!:
    | ZodObject<ZodRawShape>
    | ZodArray<ZodObject<ZodRawShape>>;

  string = z.string();
  uuid = z.string().uuid();
  email = z.string().email();
  uri = z.string().url();
  number = z
    .any()
    .transform((value) => {
      try {
        return Number(value);
      } catch {
        return value;
      }
    })
    .pipe(z.number());
  bigint = z
    .any()
    .transform((value) => {
      try {
        return BigInt(value);
      } catch {
        return value;
      }
    })
    .pipe(z.bigint());
  boolean = z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    return val;
  }, z.boolean());
  date = z
    .any()
    .transform((value) => {
      try {
        return new Date(value);
      } catch {
        return value;
      }
    })
    .pipe(z.date());
  symbol = z.symbol();
  nullish = z.union([z.void(), z.null(), z.undefined()]);
  any = z.any();
  unknown = z.unknown();
  never = z.never();

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
    const resolvedSchemas = schemas.map((schema) => {
      if (schema instanceof ZodType) {
        return schema;
      }
      return this.schemify(schema);
    });

    return z.union(
      resolvedSchemas as [ZodType, ZodType, ...ZodType[]]
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
   * Create an enum schema.
   * @param {Record<string, LiteralSchema>} schemaEnum - The enum schema.
   * @returns {ZodUnion<UnionZodResolve<[T, T, ...T[]]>>} The enum schema.
   */
  enum_<T extends Record<string, LiteralSchema>>(
    schemaEnum: T
  ): ZodUnion<
    [
      {
        [K in keyof T]: ZodLiteral<T[K]>;
      }[keyof T]
    ]
  > {
    return this.union(
      Object.values(schemaEnum) as unknown as ZodUnionContainer
    ) as unknown as ZodUnion<
      [
        {
          [K in keyof T]: ZodLiteral<T[K]>;
        }[keyof T]
      ]
    >;
  }

  /**
   * Checks if a value is a Zod schema.
   * @param {unknown} value - The value to check.
   * @returns {boolean} True if the value is a Zod schema.
   */
  isSchema(value: unknown): value is ZodType {
    return value instanceof ZodType;
  }

  /**
   * Validate a value against a schema.
   * @param {ZodCatchall} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {boolean} True if valid, otherwise false.
   */
  validate<T extends ZodIdiomaticSchema | ZodCatchall>(
    schema: T,
    value: unknown
  ): boolean {
    const resolvedSchema =
      schema instanceof ZodType ? schema : this.schemify(schema);
    return resolvedSchema.safeParse(value).success;
  }

  /**
   * Parses a value to a schema validation.
   *
   * @param {ZodCatchall} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {ParseResult} - The discrimintated parsed value if successful, the error if unsuccessful.
   */
  parse<T extends ZodIdiomaticSchema | ZodCatchall>(
    schema: T,
    value: unknown
  ): ParseResult<ZodResolve<T>> {
    const resolvedSchema =
      schema instanceof ZodType ? schema : this.schemify(schema);
    const result = resolvedSchema.safeParse(value);
    return result.success
      ? { ok: true, value: result.data }
      : {
          ok: false,
          errors: result.error.errors.flatMap((error) => {
            switch (error.code) {
              case 'invalid_union':
                return error.unionErrors.flatMap((unionError, idx) =>
                  unionError.errors.map((e) => ({
                    path: [
                      `Union Schema Variant ${idx}`,
                      ...error.path.map((p) => p.toString()),
                      ...e.path.map((p) => p.toString())
                    ],
                    message: e.message
                  }))
                );
              default:
                return [
                  {
                    path: error.path.map((p) => p.toString()),
                    message: error.message
                  }
                ];
            }
          })
        };
  }

  /**
   * Convert a schema to an OpenAPI schema object.
   * @param {ZodIdiomaticSchema} schema - The schema to convert.
   * @returns {SchemaObject} The OpenAPI schema object.
   */
  openapi<T extends ZodIdiomaticSchema | ZodCatchall>(schema: T): SchemaObject {
    return generateSchema(
      schema instanceof ZodType ? schema : this.schemify(schema)
    );
  }
}
