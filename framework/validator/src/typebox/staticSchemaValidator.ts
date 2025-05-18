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
export const string = StaticSchemaValidator.string;

/**
 * TypeBox schema definition for UUID type.
 */
export const uuid = StaticSchemaValidator.uuid;

/**
 * TypeBox schema definition for URI type.
 */
export const uri = StaticSchemaValidator.uri;

/**
 * TypeBox schema definition for email type.
 */
export const email = StaticSchemaValidator.email;

/**
 * TypeBox schema definition for number type.
 */
export const number = StaticSchemaValidator.number;

/**
 * TypeBox schema definition for bigint type.
 */
export const bigint = StaticSchemaValidator.bigint;

/**
 * TypeBox schema definition for boolean type.
 */
export const boolean = StaticSchemaValidator.boolean;

/**
 * TypeBox schema definition for date type.
 */
export const date = StaticSchemaValidator.date;

/**
 * TypeBox schema definition for symbol type.
 */
export const symbol = StaticSchemaValidator.symbol;

/**
 * TypeBox schema definition for undefined, null, void types.
 */
export const nullish = StaticSchemaValidator.nullish;

/**
 * TypeBox schema definition for void type.
 */
export const void_ = StaticSchemaValidator.void;

/**
 * TypeBox schema definition for null type.
 */
export const null_ = StaticSchemaValidator.null;

/**
 * TypeBox schema definition for undefined type.
 */
export const undefined_ = StaticSchemaValidator.undefined;

/**
 * TypeBox schema definition for any type.
 */
export const any = StaticSchemaValidator.any;

/**
 * TypeBox schema definition for unknown type.
 */
export const unknown = StaticSchemaValidator.unknown;

/**
 * TypeBox schema definition for never type.
 */
export const never = StaticSchemaValidator.never;

/**
 * TypeBox schema definition for blob type.
 */
export const binary = StaticSchemaValidator.binary;

/**
 * TypeBox schema definition for file type.
 */
export const file = StaticSchemaValidator.file;

/**
 * Transforms valid schema into TypeBox schema.
 */
export const schemify = StaticSchemaValidator.schemify.bind(
  StaticSchemaValidator
);

/**
 * Makes a valid schema optional.
 */
export const optional = StaticSchemaValidator.optional.bind(
  StaticSchemaValidator
);

/**
 * Defines an array for a valid schema.
 */
export const array = StaticSchemaValidator.array.bind(StaticSchemaValidator);

/**
 * Defines a union for a valid schema.
 */
export const union = StaticSchemaValidator.union.bind(StaticSchemaValidator);

/**
 * Defines a literal for a valid schema.
 */
export const literal = StaticSchemaValidator.literal.bind(
  StaticSchemaValidator
);

/**
 * Defines an enum for a valid schema.
 */
export const enum_ = StaticSchemaValidator.enum_.bind(StaticSchemaValidator);

/**
 * Defines a function for a valid schema.
 */
export const function_ = StaticSchemaValidator.function_.bind(
  StaticSchemaValidator
);

/**
 * Defines a record for a valid schema.
 */
export const record = StaticSchemaValidator.record.bind(StaticSchemaValidator);

/**
 * Defines a promise for a valid schema.
 */
export const promise = StaticSchemaValidator.promise.bind(
  StaticSchemaValidator
);

/**
 * Checks if a value is a TypeBox schema.
 */
export const isSchema = StaticSchemaValidator.isSchema.bind(
  StaticSchemaValidator
);

/**
 * Validates a value against a valid schema.
 */
export const validate = StaticSchemaValidator.validate.bind(
  StaticSchemaValidator
);

/**
 * Parses a value against a valid schema.
 */
export const parse = StaticSchemaValidator.parse.bind(StaticSchemaValidator);

/**
 * Generates an OpenAPI schema object from a valid schema.
 */
export const openapi = StaticSchemaValidator.openapi.bind(
  StaticSchemaValidator
);
