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
