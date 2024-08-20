import { ZodSchemaValidator } from './zodSchemaValidator';

/**
 * Factory function for creating a ZodSchemaValidator instance.
 * @returns {ZodSchemaValidator} The ZodSchemaValidator instance.
 */
export const SchemaValidator = () => new ZodSchemaValidator();

const StaticSchemaValidator = SchemaValidator();

/**
 * Zod schema definition for string type.
 */
export const string: typeof StaticSchemaValidator.string =
  StaticSchemaValidator.string;

/**
 * Zod schema definition for UUID type.
 */
export const uuid: typeof StaticSchemaValidator.uuid =
  StaticSchemaValidator.uuid;

/**
 * Zod schema definition for email type.
 */
export const email: typeof StaticSchemaValidator.email =
  StaticSchemaValidator.email;

/**
 * Zod schema definition for URI type.
 */
export const uri: typeof StaticSchemaValidator.uri = StaticSchemaValidator.uri;

/**
 * Zod schema definition for number type.
 */
export const number: typeof StaticSchemaValidator.number =
  StaticSchemaValidator.number;

/**
 * Zod schema definition for bigint type.
 */
export const bigint: typeof StaticSchemaValidator.bigint =
  StaticSchemaValidator.bigint;

/**
 * Zod schema definition for boolean type.
 */
export const boolean: typeof StaticSchemaValidator.boolean =
  StaticSchemaValidator.boolean;

/**
 * Zod schema definition for date type.
 */
export const date: typeof StaticSchemaValidator.date =
  StaticSchemaValidator.date;

/**
 * Zod schema definition for symbol type.
 */
export const symbol: typeof StaticSchemaValidator.symbol =
  StaticSchemaValidator.symbol;

/**
 * Zod schema definition for undefined, null, void types.
 */
export const nullish: typeof StaticSchemaValidator.nullish =
  StaticSchemaValidator.nullish;

/**
 * Zod schema definition for any type.
 */
export const any: typeof StaticSchemaValidator.any = StaticSchemaValidator.any;

/**
 * Zod schema definition for unknown type.
 */
export const unknown: typeof StaticSchemaValidator.unknown =
  StaticSchemaValidator.unknown;

/**
 * Zod schema definition for never type.
 */
export const never: typeof StaticSchemaValidator.never =
  StaticSchemaValidator.never;

/**
 * Transforms valid schema into Zod schema.
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
 * Parses a value to be conformant to a particular schema.
 */
export const parse: typeof StaticSchemaValidator.parse =
  StaticSchemaValidator.parse.bind(StaticSchemaValidator);

/**
 * Generates an OpenAPI schema object from a valid schema.
 */
export const openapi: typeof StaticSchemaValidator.openapi =
  StaticSchemaValidator.openapi.bind(StaticSchemaValidator);
