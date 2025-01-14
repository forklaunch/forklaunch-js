import { Prettify } from '@forklaunch/common';
import { SchemaObject } from 'openapi3-ts/oas31';
import { TResolve, TSchemaTranslate } from '../../typebox/types/schema.types';
import { ZodResolve, ZodSchemaTranslate } from '../../zod/types/schema.types';

/**
 * Represents an error with a path and message.
 */
export type ParseError = {
  path: string[];
  message: string;
};

/**
 * The result associated with an attempted parsing.
 *
 */
export type ParseResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors?: ParseError[];
    };

/**
 * Interface representing a schema validator.
 *
 * @template SchematicFunction - The function type for schemifying a schema.
 * @template OptionalFunction - The function type for making a schema optional.
 * @template ArrayFunction - The function type for converting a schema into an array.
 * @template UnionFunction - The function type for unionizing multiple schemas.
 * @template LiteralFunction - The function type for creating a literal schema.
 * @template ValidationFunction - The function type for validating a value against a schema.
 * @template ParseFunction - The function type for parsing a value against a schema.
 * @template OpenAPIFunction - The function type for converting a schema into an OpenAPI schema object.
 */
export interface SchemaValidator<
  CompilationFunction = <T>(schema: T) => unknown,
  SchematicFunction = <T>(schema: T) => unknown,
  OptionalFunction = <T>(schema: T) => unknown,
  ArrayFunction = <T>(schema: T) => unknown,
  UnionFunction = <T>(schemas: T[]) => unknown,
  LiteralFunction = <T extends LiteralSchema>(schema: T) => unknown,
  EnumFunction = <T extends LiteralSchema>(
    schemaEnum: Record<string, T>
  ) => unknown,
  SchemaGuardFunction = <T>(value: unknown) => value is T,
  ValidationFunction = <T>(schema: T, value: unknown) => boolean,
  ParseFunction = <T>(
    schema: T,
    value: unknown
  ) => ParseResult<SchemaResolve<T>>,
  OpenAPIFunction = <T>(schema: T) => SchemaObject
> {
  /**
   * The type of the schema validator. Meant to be used with non-null assertions.
   */
  _Type: unknown;

  /**
   * The catch-all type for the schema. Meant to be used with non-null assertions.
   */
  _SchemaCatchall: unknown;

  /**
   * The valid schema object type. Meant to be used with non-null assertions.
   */
  _ValidSchemaObject: unknown;

  /**
   * Validator for string type.
   */
  string: unknown;

  /**
   * Validator for uuid type.
   */
  uuid: unknown;

  /**
   * Validator for uri type.
   */
  uri: unknown;

  /**
   * Validator for email type.
   */
  email: unknown;

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
   * Validator for nullish type.
   */
  nullish: unknown;

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
   * Compiles schema if this exists, for optimal performance.
   *
   * @param {T} schema - The schema to compile.
   * @returns {unknown} - The compiled schema.
   */
  compile: CompilationFunction;

  /**
   * Converts a valid schema input into a schemified form.
   *
   * @param {T} schema - The schema to schemify.
   * @returns {unknown} - The schemified form of the schema.
   */
  schemify: SchematicFunction;

  /**
   * Converts a schema into an optional schema.
   *
   * @param {T} schema - The schema to make optional.
   * @returns {unknown} - The optional form of the schema.
   */
  optional: OptionalFunction;

  /**
   * Converts a schema into an array schema.
   *
   * @param {T} schema - The schema to convert into an array.
   * @returns {unknown} - The array form of the schema.
   */
  array: ArrayFunction;

  /**
   * Converts multiple schemas into a union schema.
   *
   * @param {T[]} schemas - The schemas to unionize.
   * @returns {unknown} - The union form of the schemas.
   */
  union: UnionFunction;

  /**
   * Creates a literal schema from a value.
   *
   * @param {T} value - The literal value.
   * @returns {unknown} - The literal schema.
   */
  literal: LiteralFunction;

  /**
   * Creates an enum schema from a record of literal values.
   *
   * @param {Record<string, T>} schemaEnum - The enum schema.
   * @returns {unknown} - The enum schema.
   */
  enum_: EnumFunction;

  /**
   * Checks if a value is a schema.
   *
   * @param {unknown} value - The value to check.
   * @returns {boolean} - Whether the value is a schema.
   */
  isSchema: SchemaGuardFunction;

  /**
   * Validates a value against a schema.
   *
   * @param {T} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {boolean} - Whether the value is valid according to the schema.
   */
  validate: ValidationFunction;

  /**
   * Parses a value to a schema validation.
   *
   * @param {T} schema - The schema to validate against.
   * @param {unknown} value - The value to validate.
   * @returns {ParseResult} - The discrimintated parsed value if successful, the error if unsuccessful.
   */
  parse: ParseFunction;

  /**
   * Converts a schema into an OpenAPI schema object.
   *
   * @param {T} schema - The schema to convert.
   * @returns {SchemaObject} - The OpenAPI schema object.
   */
  openapi: OpenAPIFunction;
}

/**
 * Type representing any schema validator.
 */
export type AnySchemaValidator = SchemaValidator<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
> & {
  /**
   * The type of the schema resolver.
   */
  _Type: keyof SchemaResolve<unknown>;
};

/**
 * Interface representing schema resolution for different validation libraries.
 *
 * @template T - The type of the schema to resolve.
 */
export interface SchemaResolve<T> {
  /**
   * Schema resolution for Zod.
   */
  Zod: ZodResolve<T>;

  /**
   * Schema resolution for TypeBox.
   */
  TypeBox: TResolve<T>;
}

/**
 * Interface representing schema translation for different validation libraries.
 *
 * @template T - The type of the schema to translate.
 */
export interface SchemaTranslate<T> {
  /**
   * Schema translation for Zod.
   */
  Zod: ZodSchemaTranslate<T>;

  /**
   * Schema translation for TypeBox.
   */
  TypeBox: TSchemaTranslate<T>;
}

/**
 * Type representing the prettified schema translation.
 *
 * @template T - The type of the schema to translate.
 * @template SV - The type of the schema validator.
 */
type SchemaPrettify<T, SV extends AnySchemaValidator> = Prettify<
  SchemaTranslate<T>[SV['_Type']]
>;

/**
 * Type representing a schema, which can be a valid schema object or an idiomatic schema.
 *
 * @template T - The type of the schema.
 * @template SV - The type of the schema validator.
 */
export type Schema<
  T extends SV['_ValidSchemaObject'] | IdiomaticSchema<SV>,
  SV extends AnySchemaValidator
> = SchemaPrettify<SchemaResolve<T>[SV['_Type']], SV>;

/**
 * Represents a schema for an unboxed object where each key can have an idiomatic schema.
 *
 * @template SV - The type of the schema validator.
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
 * @template SV - The type of the schema validator.
 */
export type IdiomaticSchema<SV extends AnySchemaValidator> =
  | LiteralSchema
  | SV['_SchemaCatchall']
  | UnboxedObjectSchema<SV>;

/**
 * Increments a number type by one, with support up to 50.
 *
 * @template T - The number type to increment.
 */
export type Increment<T extends number> = T extends 0
  ? 1
  : T extends 1
    ? 2
    : T extends 2
      ? 3
      : T extends 3
        ? 4
        : T extends 4
          ? 5
          : T extends 5
            ? 6
            : T extends 6
              ? 7
              : T extends 7
                ? 8
                : T extends 8
                  ? 9
                  : T extends 9
                    ? 10
                    : T extends 10
                      ? 11
                      : T extends 11
                        ? 12
                        : T extends 12
                          ? 13
                          : T extends 13
                            ? 14
                            : T extends 14
                              ? 15
                              : T extends 15
                                ? 16
                                : T extends 16
                                  ? 17
                                  : T extends 17
                                    ? 18
                                    : T extends 18
                                      ? 19
                                      : T extends 19
                                        ? 20
                                        : T extends 20
                                          ? 21
                                          : T extends 21
                                            ? 22
                                            : T extends 22
                                              ? 23
                                              : T extends 23
                                                ? 24
                                                : T extends 24
                                                  ? 25
                                                  : T extends 25
                                                    ? 26
                                                    : T extends 26
                                                      ? 27
                                                      : T extends 27
                                                        ? 28
                                                        : T extends 28
                                                          ? 29
                                                          : T extends 29
                                                            ? 30
                                                            : T extends 30
                                                              ? 31
                                                              : T extends 31
                                                                ? 32
                                                                : T extends 32
                                                                  ? 33
                                                                  : T extends 33
                                                                    ? 34
                                                                    : T extends 34
                                                                      ? 35
                                                                      : T extends 35
                                                                        ? 36
                                                                        : T extends 36
                                                                          ? 37
                                                                          : T extends 37
                                                                            ? 38
                                                                            : T extends 38
                                                                              ? 39
                                                                              : T extends 39
                                                                                ? 40
                                                                                : T extends 40
                                                                                  ? 41
                                                                                  : T extends 41
                                                                                    ? 42
                                                                                    : T extends 42
                                                                                      ? 43
                                                                                      : T extends 43
                                                                                        ? 44
                                                                                        : T extends 44
                                                                                          ? 45
                                                                                          : T extends 45
                                                                                            ? 46
                                                                                            : T extends 46
                                                                                              ? 47
                                                                                              : T extends 47
                                                                                                ? 48
                                                                                                : T extends 48
                                                                                                  ? 49
                                                                                                  : T extends 49
                                                                                                    ? 50
                                                                                                    : 50;

/**
 * Represents key types that can be used in the schema.
 */
export type KeyTypes = string | number;
