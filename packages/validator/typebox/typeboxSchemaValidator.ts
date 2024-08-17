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
  TKind,
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
} from '../types/schema.types';
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
        ? `Expected ${params.schema.errorType} value${params.schema.errorSuffix ? 's' : ''}`
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
      <T extends TIdiomaticSchema>(schema: T, value: unknown) => boolean,
      <T extends TIdiomaticSchema>(
        schema: T,
        value: unknown
      ) => ParseResult<TResolve<T>>,
      <T extends TIdiomaticSchema>(schema: T) => SchemaObject
    >
{
  _Type!: 'TypeBox';
  _SchemaCatchall!: TKind;
  _ValidSchemaObject!: TObject<TProperties> | TArray<TObject<TProperties>>;

  string = Type.String();
  // uuid = Type.String({ format: 'uuid' });
  uuid = Type.String({
    pattern:
      '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
    errorType: 'uuid'
  });
  uri = Type.String({
    pattern: '/^[a-zA-Z][a-zA-Z\\d+-.]*:[^\\s]*$/',
    errorType: 'uri'
  });
  email = Type.String({
    pattern:
      '(?:[a-z0-9!#$%&\'*+/=?^_{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_{|}~-]+)*|"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)])',
    errorType: 'email'
  });
  number = Type.Transform(
    Type.Union([Type.Number(), Type.String({ pattern: '^[0-9]+$' })], {
      errorType: 'number-like'
    })
  )
    .Decode((value) => {
      if (typeof value === 'string') {
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
      [Type.BigInt(), Type.Number(), Type.String({ pattern: '^[0-9]+$' })],
      {
        errorType: 'BigInt-like'
      }
    )
  )
    .Decode((value) => {
      if (typeof value === 'string') {
        try {
          return BigInt(value);
        } catch (error) {
          throw new Error('Invalid bigint');
        }
      }
      return BigInt(value);
    })
    .Encode(BigInt);
  boolean = Type.Transform(
    Type.Union(
      [Type.Boolean(), Type.String({ pattern: '^(?i:true|false)$' })],
      {
        errorType: 'boolean-like'
      }
    )
  )
    .Decode((value) => {
      if (typeof value === 'string') {
        if ((value as string).toLowerCase() === 'true') return true;
        if ((value as string).toLowerCase() === 'false') return false;
      } else {
        return value;
      }
    })
    .Encode(Boolean);
  date = Type.Date();
  symbol = Type.Symbol();
  empty = Type.Union([Type.Void(), Type.Null(), Type.Undefined()]);
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
    if (Object.hasOwn(schema, 'errorType')) {
      return schema.errorType;
    }
    return schema[Kind].toLowerCase();
  }

  /**
   * Pretty print TypeBox errors.
   *
   * @param {ValueError[]} errors
   * @returns
   */
  private prettyPrintTypeBoxErrors(errors: ValueError[]): string | undefined {
    if (!errors || errors.length === 0) return;

    const errorMessages = errors.map((err, index) => {
      const path =
        err.path.length > 0 ? err.path.split('/').slice(1).join(' > ') : 'root';
      return `${index + 1}. Path: ${path}\n   Message: ${err.message}`;
    });
    return `Validation failed with the following errors:\n${errorMessages.join('\n\n')}`;
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

    return Type.Object(newSchema) as TResolve<T>;
  }

  /**
   * Make a schema optional.
   * @param {TIdiomaticSchema} schema - The schema to make optional.
   * @returns {TOptional<TResolve<T>>} The optional schema.
   */
  optional<T extends TIdiomaticSchema>(schema: T): TOptional<TResolve<T>> {
    let schemified;
    if (KindGuard.IsSchema(schema)) {
      schemified = schema;
    } else {
      schemified = this.schemify(schema);
    }
    return Type.Optional(schemified) as TOptional<TResolve<T>>;
  }

  /**
   * Create an array schema.
   * @param {TIdiomaticSchema} schema - The schema to use for array items.
   * @returns {TArray<TResolve<T>>} The array schema.
   */
  array<T extends TIdiomaticSchema>(schema: T): TArray<TResolve<T>> {
    let schemified;
    if (KindGuard.IsSchema(schema)) {
      schemified = schema;
    } else {
      schemified = this.schemify(schema);
    }
    return Type.Array(schemified, {
      errorType: `array of ${this.errorType(schemified)}`
    }) as TArray<TResolve<T>>;
  }

  /**
   * Create a union schema.
   * @param {TUnionContainer} schemas - The schemas to union.
   * @returns {TUnion<UnionTResolve<T>>} The union schema.
   *
   * WARNING: If "empty" or TUndefined is included in the union, the key will still be expected.
   * This is a limitation of TypeBox. Consider using "optional" instead.
   */
  union<T extends TUnionContainer>(schemas: [...T]): TUnion<UnionTResolve<T>> {
    const unionTypes = schemas.map((schema) => {
      if (KindGuard.IsSchema(schema)) {
        return schema;
      } else {
        return this.schemify(schema);
      }
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
      errorType: `literal "${value}"`
    });
  }

  /**
   * Validate a value against a schema.
   *
   * @param {TSchema} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {boolean} True if valid, otherwise false.
   */
  validate<T extends TIdiomaticSchema | TSchema>(
    schema: T | TypeCheck<TResolve<T>>,
    value: unknown
  ): boolean {
    if (schema instanceof TypeCheck) {
      return schema.Check(value);
    } else {
      let schemified;
      if (KindGuard.IsSchema(schema)) {
        schemified = schema;
      } else {
        schemified = this.schemify(schema);
      }
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
  parse<T extends TIdiomaticSchema | TSchema>(
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
      let schemified;
      if (KindGuard.IsSchema(schema)) {
        schemified = schema;
      } else {
        schemified = this.schemify(schema);
      }

      if (Value.Check(schemified, value)) {
        conversion = Value.Decode(schemified, value);
      } else {
        errors = Array.from(Value.Errors(schemified, value));
      }
    }

    return conversion !== undefined
      ? {
          ok: true,
          value: conversion as TResolve<T>
        }
      : {
          ok: false,
          error:
            errors !== undefined
              ? this.prettyPrintTypeBoxErrors(errors)
              : undefined
        };
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
