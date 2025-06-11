import { TypeboxSchemaValidator } from './typeboxSchemaValidator';

/**
 * Factory function for creating a TypeboxSchemaValidator instance.
 * @returns {TypeboxSchemaValidator} The TypeboxSchemaValidator instance.
 */
export const SchemaValidator = () => new TypeboxSchemaValidator();

const StaticSchemaValidator = SchemaValidator();

/**
 * TypeBox schema definition for string type.
 */
export const string: typeof StaticSchemaValidator.string =
  StaticSchemaValidator.string;

/**
 * TypeBox schema definition for UUID type.
 */
export const uuid: typeof StaticSchemaValidator.uuid =
  StaticSchemaValidator.uuid;

/**
 * TypeBox schema definition for URI type.
 */
export const uri: typeof StaticSchemaValidator.uri = StaticSchemaValidator.uri;

/**
 * TypeBox schema definition for email type.
 */
export const email: typeof StaticSchemaValidator.email =
  StaticSchemaValidator.email;

/**
 * TypeBox schema definition for number type.
 */
export const number: typeof StaticSchemaValidator.number =
  StaticSchemaValidator.number;

/**
 * TypeBox schema definition for bigint type.
 */
export const bigint: typeof StaticSchemaValidator.bigint =
  StaticSchemaValidator.bigint;

/**
 * TypeBox schema definition for boolean type.
 */
export const boolean: typeof StaticSchemaValidator.boolean =
  StaticSchemaValidator.boolean;

/**
 * TypeBox schema definition for date type.
 */
export const date: typeof StaticSchemaValidator.date =
  StaticSchemaValidator.date;

/**
 * TypeBox schema definition for symbol type.
 */
export const symbol: typeof StaticSchemaValidator.symbol =
  StaticSchemaValidator.symbol;

/**
 * TypeBox schema definition for undefined, null, void types.
 */
export const nullish: typeof StaticSchemaValidator.nullish =
  StaticSchemaValidator.nullish;

/**
 * TypeBox schema definition for void type.
 */
export const void_: typeof StaticSchemaValidator.void =
  StaticSchemaValidator.void;

/**
 * TypeBox schema definition for null type.
 */
export const null_: typeof StaticSchemaValidator.null =
  StaticSchemaValidator.null;

/**
 * TypeBox schema definition for undefined type.
 */
export const undefined_: typeof StaticSchemaValidator.undefined =
  StaticSchemaValidator.undefined;

/**
 * TypeBox schema definition for any type.
 */
export const any: typeof StaticSchemaValidator.any = StaticSchemaValidator.any;

/**
 * TypeBox schema definition for unknown type.
 */
export const unknown: typeof StaticSchemaValidator.unknown =
  StaticSchemaValidator.unknown;

/**
 * TypeBox schema definition for never type.
 */
export const never: typeof StaticSchemaValidator.never =
  StaticSchemaValidator.never;

/**
 * TypeBox schema definition for blob type.
 */
export const binary: typeof StaticSchemaValidator.binary =
  StaticSchemaValidator.binary;

/**
 * TypeBox schema definition for file type.
 */
export const file: typeof StaticSchemaValidator.file =
  StaticSchemaValidator.file;

/**
 * TypeBox schema definition for type type.
 */
export const type: typeof StaticSchemaValidator.type =
  StaticSchemaValidator.type;

/**
 * Transforms valid schema into TypeBox schema.
 */
export const schemify: typeof StaticSchemaValidator.schemify =
  StaticSchemaValidator.schemify.bind(StaticSchemaValidator);

/**
 * Makes a valid schema optional.
 */
export const optional: typeof StaticSchemaValidator.optional =
  StaticSchemaValidator.optional.bind(StaticSchemaValidator);

/**
 * Defines an array for a valid schema.
 */
export const array: typeof StaticSchemaValidator.array =
  StaticSchemaValidator.array.bind(StaticSchemaValidator);

/**
 * Defines a union for a valid schema.
 */
export const union: typeof StaticSchemaValidator.union =
  StaticSchemaValidator.union.bind(StaticSchemaValidator);

/**
 * Defines a literal for a valid schema.
 */
export const literal: typeof StaticSchemaValidator.literal =
  StaticSchemaValidator.literal.bind(StaticSchemaValidator);

/**
 * Defines an enum for a valid schema.
 */
export const enum_: typeof StaticSchemaValidator.enum_ =
  StaticSchemaValidator.enum_.bind(StaticSchemaValidator);

/**
 * Defines a function for a valid schema.
 */
export const function_: typeof StaticSchemaValidator.function_ =
  StaticSchemaValidator.function_.bind(StaticSchemaValidator);

/**
 * Defines a record for a valid schema.
 */
export const record: typeof StaticSchemaValidator.record =
  StaticSchemaValidator.record.bind(StaticSchemaValidator);

/**
 * Defines a promise for a valid schema.
 */
export const promise: typeof StaticSchemaValidator.promise =
  StaticSchemaValidator.promise.bind(StaticSchemaValidator);

/**
 * Checks if a value is a TypeBox schema.
 */
export const isSchema: typeof StaticSchemaValidator.isSchema =
  StaticSchemaValidator.isSchema.bind(StaticSchemaValidator);

/**
 * Validates a value against a valid schema.
 */
export const validate: typeof StaticSchemaValidator.validate =
  StaticSchemaValidator.validate.bind(StaticSchemaValidator);

/**
 * Parses a value against a valid schema.
 */
export const parse: typeof StaticSchemaValidator.parse =
  StaticSchemaValidator.parse.bind(StaticSchemaValidator);

/**
 * Generates an OpenAPI schema object from a valid schema.
 */
export const openapi: typeof StaticSchemaValidator.openapi =
  StaticSchemaValidator.openapi.bind(StaticSchemaValidator);
