/**
 * This module provides a TypeScript-based schema definition using the TypeBox library.
 * It includes various types, schema creation, validation, and OpenAPI integration.
 *
 * @module TypeboxSchemaValidator
 */

import {
  Kind,
  KindGuard,
  TArray,
  TLiteral,
  TOptional,
  TProperties,
  TSchema,
  TUnion,
  Type
} from '@sinclair/typebox';
import { TypeCheck, TypeCompiler } from '@sinclair/typebox/compiler';
import {
  DefaultErrorFunction,
  SetErrorFunction,
  ValueErrorType
} from '@sinclair/typebox/errors';
import { Value, ValueError } from '@sinclair/typebox/value';
import { SchemaObject } from 'openapi3-ts/oas31';
import {
  LiteralSchema,
  ParseResult,
  SchemaValidator as SV
} from '../shared/types/schema.types';
import {
  TCatchall,
  TIdiomaticSchema,
  TObject,
  TObjectShape,
  TResolve,
  TUnionContainer,
  UnionTResolve
} from './types/schema.types';

/**
 * Typebox custom error function
 */
SetErrorFunction((params) => {
  switch (params.errorType) {
    case ValueErrorType.Union:
    case ValueErrorType.Array:
    case ValueErrorType.String:
    case ValueErrorType.Number:
      return params.schema.errorType
        ? `Expected ${params.schema.errorType} value${
            params.schema.errorSuffix ? 's' : ''
          }`
        : DefaultErrorFunction(params);
    default:
      return DefaultErrorFunction(params);
  }
});

/**
 * Class representing a TypeBox schema definition.
 * @implements {SchemaValidator}
 */
export class TypeboxSchemaValidator
  implements
    SV<
      <T extends TObject<TProperties>>(schema: T) => TypeCheck<T>,
      <T extends TIdiomaticSchema>(schema: T) => TResolve<T>,
      <T extends TIdiomaticSchema>(schema: T) => TOptional<TResolve<T>>,
      <T extends TIdiomaticSchema>(schema: T) => TArray<TResolve<T>>,
      <T extends TUnionContainer>(schemas: [...T]) => TUnion<UnionTResolve<T>>,
      <T extends LiteralSchema>(value: T) => TLiteral<T>,
      <T extends Record<string, LiteralSchema>>(
        schemaEnum: T
      ) => TUnion<
        [
          {
            [K in keyof T]: TLiteral<T[K]>;
          }[keyof T]
        ]
      >,
      (value: unknown) => value is TSchema,
      <T extends TIdiomaticSchema | TCatchall>(
        schema: T,
        value: unknown
      ) => boolean,
      <T extends TIdiomaticSchema | TCatchall>(
        schema: T,
        value: unknown
      ) => ParseResult<TResolve<T>>,
      <T extends TIdiomaticSchema | TCatchall>(schema: T) => SchemaObject
    >
{
  _Type = 'TypeBox' as const;
  _SchemaCatchall!: TCatchall;
  _ValidSchemaObject!: TObject<TProperties> | TArray<TObject<TProperties>>;

  string = Type.String();
  uuid = Type.String({
    pattern:
      '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
    errorType: 'uuid'
  });
  uri = Type.String({
    pattern: '^[a-zA-Z][a-zA-Z\\d+-.]*:[^\\s]*$',
    errorType: 'uri'
  });
  email = Type.String({
    pattern:
      '(?:[a-z0-9!#$%&\'*+/=?^_{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_{|}~-]+)*|"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)])',
    errorType: 'email'
  });
  number = Type.Transform(
    Type.Union(
      [
        Type.Number(),
        Type.String({ pattern: '^[0-9]+$' }),
        Type.Boolean(),
        Type.Null(),
        Type.Date(),
        Type.BigInt()
      ],
      {
        errorType: 'number-like',
        openapiType: Type.Number()
      }
    )
  )
    .Decode((value) => {
      if (typeof value !== 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error('Invalid number');
        } else {
          return num;
        }
      }
      return value;
    })
    .Encode(Number);
  bigint = Type.Transform(
    Type.Union(
      [
        Type.BigInt(),
        Type.Number(),
        Type.String({ pattern: '^[0-9]+$' }),
        Type.Boolean(),
        Type.Date()
      ],
      {
        errorType: 'BigInt-like',
        openapiType: Type.BigInt()
      }
    )
  )
    .Decode((value) => {
      if (typeof value !== 'bigint') {
        try {
          return BigInt(value instanceof Date ? value.getTime() : value);
        } catch {
          throw new Error('Invalid bigint');
        }
      }
      return value;
    })
    .Encode(BigInt);
  boolean = Type.Transform(
    Type.Union(
      [
        Type.Boolean(),
        Type.String({
          pattern: '^(t|T)(r|R)(u|U)(e|E)$|^(f|F)(a|A)(l|L)(s|S)(e|E)$'
        })
      ],
      {
        errorType: 'boolean-like',
        openapiType: Type.Boolean()
      }
    )
  )
    .Decode((value) => {
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        return false;
      } else {
        return value;
      }
    })
    .Encode(Boolean);
  date = Type.Transform(
    Type.Union(
      [
        Type.Date(),
        Type.Number(),
        Type.String({
          pattern:
            '^\\d{4}(-\\d{2}){0,2}(T\\d{2}:\\d{2}(:\\d{2}(\\.\\d{1,3})?)?(Z|([+-]\\d{2}:\\d{2}))?)?$|^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$|^\\d{4}\\/\\d{1,2}\\/\\d{1,2}$|^\\d+$'
        }),
        Type.Boolean(),
        Type.Null()
      ],
      {
        errorType: 'date',
        openapiType: Type.Date()
      }
    )
  )
    .Decode((value) => {
      if (!(value instanceof Date)) {
        if (value === null || typeof value === 'boolean') {
          return new Date(value ? 1 : 0);
        }
        return new Date(value);
      }
      return value;
    })
    .Encode((value) => new Date(value));
  symbol = Type.Symbol();
  nullish = Type.Union([Type.Void(), Type.Null(), Type.Undefined()], {
    errorType: 'nullish'
  });
  any = Type.Any();
  unknown = Type.Unknown();
  never = Type.Never();

  /**
   * Extracts the error type of a schema for error messages.
   *
   * @param {TCatchall} schema - A schema that contains some type information.
   * @returns The type of the schema for error messages.
   */
  private errorType(schema: TCatchall) {
    if (KindGuard.IsSchema(schema) && Object.hasOwn(schema, 'errorType')) {
      return schema.errorType;
    } else if (KindGuard.IsLiteral(schema)) {
      return schema.const;
    }
    return schema[Kind].toLowerCase();
  }

  /**
   * Compiles schema if this exists, for optimal performance.
   *
   * @param {TObject<TProperties>} schema - The schema to compile.
   * @returns {TypeCheck<T>} - The compiled schema.
   */
  compile<T extends TObject<TProperties>>(schema: T): TypeCheck<T> {
    return TypeCompiler.Compile(schema);
  }

  /**
   * Convert a schema to a TypeBox schema.
   * @param {TIdiomaticSchema} schema - The schema to convert.
   * @returns {TResolve<T>} The resolved schema.
   */
  schemify<T extends TIdiomaticSchema>(schema: T): TResolve<T> {
    if (
      typeof schema === 'string' ||
      typeof schema === 'number' ||
      typeof schema === 'boolean'
    ) {
      return Type.Literal(schema) as TResolve<T>;
    }

    if (KindGuard.IsSchema(schema) || schema instanceof TypeCheck) {
      return schema as TResolve<T>;
    }

    const newSchema: TObjectShape = {};
    Object.getOwnPropertyNames(schema).forEach((key) => {
      if (KindGuard.IsSchema(schema[key])) {
        newSchema[key] = schema[key];
      } else {
        const schemified = this.schemify(schema[key]);
        newSchema[key] = schemified;
      }
    });

    return Type.Object(newSchema) as unknown as TResolve<T>;
  }

  /**
   * Make a schema optional.
   * @param {TIdiomaticSchema} schema - The schema to make optional.
   * @returns {TOptional<TResolve<T>>} The optional schema.
   */
  optional<T extends TIdiomaticSchema>(schema: T): TOptional<TResolve<T>> {
    const schemified = KindGuard.IsSchema(schema)
      ? schema
      : this.schemify(schema);
    return Type.Optional(schemified) as TOptional<TResolve<T>>;
  }

  /**
   * Create an array schema.
   * @param {TIdiomaticSchema} schema - The schema to use for array items.
   * @returns {TArray<TResolve<T>>} The array schema.
   */
  array<T extends TIdiomaticSchema>(schema: T): TArray<TResolve<T>> {
    const schemified = KindGuard.IsSchema(schema)
      ? schema
      : this.schemify(schema);
    return Type.Array(schemified, {
      errorType: `array of ${this.errorType(schemified)}`
    }) as TArray<TResolve<T>>;
  }

  /**
   * Create a union schema.
   * @param {TUnionContainer} schemas - The schemas to union.
   * @returns {TUnion<UnionTResolve<T>>} The union schema.
   *
   * WARNING: If "nullish" or TUndefined is included in the union, the key will still be expected.
   * This is a limitation of TypeBox. Consider using "optional" instead.
   */
  union<T extends TUnionContainer>(schemas: [...T]): TUnion<UnionTResolve<T>> {
    const unionTypes = schemas.map((schema) => {
      return KindGuard.IsSchema(schema) ? schema : this.schemify(schema);
    });

    return Type.Union(unionTypes, {
      errorType: `any of ${unionTypes
        .map((s) => this.errorType(s))
        .join(', ')}`,
      errorSuffix: true
    }) as TUnion<UnionTResolve<T>>;
  }

  /**
   * Create a literal schema.
   * @param {LiteralSchema} value - The literal value.
   * @returns {TLiteral<T>} The literal schema.
   */
  literal<T extends LiteralSchema>(value: T): TLiteral<T> {
    return Type.Literal(value, {
      errorType: value
    });
  }

  /**
   * Create an enum schema.
   * @param {Record<string, LiteralSchema>} schemaEnum - The enum schema.
   * @returns {TUnion<UnionTResolve<T[]>>} The enum schema.
   */
  enum_<T extends Record<string, LiteralSchema>>(
    schemaEnum: T
  ): TUnion<
    [
      {
        [K in keyof T]: TLiteral<T[K]>;
      }[keyof T]
    ]
  > {
    return this.union(
      Object.values(schemaEnum).map((value) => this.literal(value))
    ) as unknown as TUnion<
      [
        {
          [K in keyof T]: TLiteral<T[K]>;
        }[keyof T]
      ]
    >;
  }

  /**
   * Check if a value is a TypeBox object schema.
   * @param {unknown} value - The value to check.
   * @returns {boolean} True if the value is a TypeBox object schema.
   */
  isSchema(value: unknown): value is TSchema {
    return KindGuard.IsSchema(value);
  }

  /**
   * Validate a value against a schema.
   *
   * @param {TSchema} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {boolean} True if valid, otherwise false.
   */
  validate<T extends TIdiomaticSchema | TCatchall>(
    schema: T | TypeCheck<TResolve<T>>,
    value: unknown
  ): boolean {
    if (schema instanceof TypeCheck) {
      return schema.Check(value);
    } else {
      const schemified = KindGuard.IsSchema(schema)
        ? schema
        : this.schemify(schema);
      return Value.Check(schemified, value);
    }
  }

  /**
   * Parse a value against a schema.
   *
   * @param {TSchema} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {ParseResult<TResolve<T>>} The parsing result.
   */
  parse<T extends TIdiomaticSchema | TCatchall>(
    schema: T | TypeCheck<TResolve<T>>,
    value: unknown
  ): ParseResult<TResolve<T>> {
    let errors: ValueError[] = [];
    let conversion: unknown;
    if (schema instanceof TypeCheck) {
      if (schema.Check(value)) {
        conversion = schema.Decode(value);
      } else {
        errors = Array.from(schema.Errors(value));
      }
    } else {
      const schemified = KindGuard.IsSchema(schema)
        ? schema
        : this.schemify(schema);

      if (Value.Check(schemified, value)) {
        conversion = Value.Decode(schemified, value);
      } else {
        errors = Array.from(Value.Errors(schemified, value));
      }
    }

    errors.forEach((error) => {
      if (
        error.type === ValueErrorType.Union &&
        error.schema.errorType === 'any of'
      ) {
        error.errors.forEach((e, idx) => {
          console.log({
            p: [`Union Schema Variant ${idx}`, error.path],
            message: Array.from(e)
          });
        });
      }
    });
    return errors != null && errors.length === 0
      ? {
          ok: true,
          value: conversion as TResolve<T>
        }
      : {
          ok: false,
          errors: errors.flatMap((error) => {
            if (
              error.type === ValueErrorType.Union &&
              error.schema.errorType.includes('any of')
            ) {
              return error.errors.flatMap((e, idx) =>
                Array.from(e).map((e) => ({
                  path: [
                    `Union Schema Variant ${idx}`,
                    ...error.path.split('/').slice(1),
                    ...e.path.split('/').slice(1)
                  ],
                  message: e.message
                }))
              );
            } else {
              return [
                {
                  path: error.path.split('/').slice(1),
                  message: error.message
                }
              ];
            }
          })
        };
  }

  /**
   * Convert a schema to an OpenAPI schema object.
   * @param {TIdiomaticSchema | TCatchall} schema - The schema to convert.
   * @returns {SchemaObject} The OpenAPI schema object.
   */
  openapi<T extends TIdiomaticSchema | TCatchall>(schema: T): SchemaObject {
    const schemified = KindGuard.IsSchema(schema)
      ? schema
      : this.schemify(schema);

    if (
      Object.hasOwn(schemified, 'openapiType') ||
      KindGuard.IsLiteral(schemified)
    ) {
      return schemified.openapiType as SchemaObject;
    }

    const newSchema: SchemaObject = Object.assign({}, schemified);
    if (Object.hasOwn(newSchema, 'properties')) {
      newSchema.properties = { ...schemified.properties };
      if (newSchema.properties) {
        Object.entries(newSchema.properties).forEach(([key, value]) => {
          if (KindGuard.IsSchema(value) && newSchema.properties) {
            newSchema.properties[key] = this.openapi(value);
          }
        });
      }
    }

    return newSchema;
  }
}
