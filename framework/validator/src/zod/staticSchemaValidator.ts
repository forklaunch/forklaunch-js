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
export const string = StaticSchemaValidator.string;

/**
 * Zod schema definition for UUID type.
 */
export const uuid = StaticSchemaValidator.uuid;

/**
 * Zod schema definition for email type.
 */
export const email = StaticSchemaValidator.email;

/**
 * Zod schema definition for URI type.
 */
export const uri = StaticSchemaValidator.uri;

/**
 * Zod schema definition for number type.
 */
export const number = StaticSchemaValidator.number;

/**
 * Zod schema definition for bigint type.
 */
export const bigint = StaticSchemaValidator.bigint;

/**
 * Zod schema definition for boolean type.
 */
export const boolean = StaticSchemaValidator.boolean;

/**
 * Zod schema definition for date type.
 */
export const date = StaticSchemaValidator.date;

/**
 * Zod schema definition for symbol type.
 */
export const symbol = StaticSchemaValidator.symbol;

/**
 * Zod schema definition for undefined, null, void types.
 */
export const nullish = StaticSchemaValidator.nullish;

/**
 * Zod schema definition for void type.
 */
export const void_ = StaticSchemaValidator.void;

/**
 * Zod schema definition for null type.
 */
export const null_ = StaticSchemaValidator.null;

/**
 * Zod schema definition for undefined type.
 */
export const undefined_ = StaticSchemaValidator.undefined;

/**
 * Zod schema definition for any type.
 */
export const any = StaticSchemaValidator.any;

/**
 * Zod schema definition for unknown type.
 */
export const unknown = StaticSchemaValidator.unknown;

/**
 * Zod schema definition for never type.
 */
export const never = StaticSchemaValidator.never;

/**
 * Transforms valid schema into Zod schema.
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
 * Checks if a value is a Zod schema.
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
 * Parses a value to be conformant to a particular schema.
 */
export const parse = StaticSchemaValidator.parse.bind(StaticSchemaValidator);

/**
 * Generates an OpenAPI schema object from a valid schema.
 */
export const openapi = StaticSchemaValidator.openapi.bind(
  StaticSchemaValidator
);
