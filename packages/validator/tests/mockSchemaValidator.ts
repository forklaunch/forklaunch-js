import { SchemaValidator } from '../index';
import { LiteralSchema } from '../types/schema.types';

declare module '../types/schema.types' {
  interface SchemaResolve<T> {
    Mock: T;
  }

  interface SchemaTranslate<T> {
    Mock: T;
  }
}

export class MockSchemaValidator implements SchemaValidator {
  _Type!: 'Mock';
  _SchemaCatchall!: string;
  _ValidSchemaObject!: string;

  string = 'string';
  number = 'number';
  bigint = 'bigint';
  boolean = 'boolean';
  date = 'date';
  symbol = 'symbol';
  empty = 'empty';
  any = 'any';
  unknown = 'unknown';
  never = 'never';

  schemify<T>(schema: T) {
    return schema;
  }
  optional<T>(schema: T) {
    return 'optional ' + schema;
  }
  array<T>(schema: T) {
    return 'array ' + schema;
  }
  union<T>(schemas: T[]) {
    return schemas.join(' | ');
  }
  literal<T extends LiteralSchema>(schema: T): `literal ${T}` {
    return `literal ${schema}`;
  }
  validate<T>(schema: T) {
    return true;
  }
  openapi<T>(schema: T) {
    return {};
  }
}

export const mockSchemaValidator = new MockSchemaValidator();
export const string = mockSchemaValidator.string;
export const number = mockSchemaValidator.number;
export const bigint = mockSchemaValidator.bigint;
export const boolean = mockSchemaValidator.boolean;
export const date = mockSchemaValidator.date;
export const symbol = mockSchemaValidator.symbol;
export const empty = mockSchemaValidator.empty;
export const any = mockSchemaValidator.any;
export const unknown = mockSchemaValidator.unknown;
export const never = mockSchemaValidator.never;
export const schemify = mockSchemaValidator.schemify.bind(mockSchemaValidator);
export const optional = mockSchemaValidator.optional.bind(mockSchemaValidator);
export const array = mockSchemaValidator.array.bind(mockSchemaValidator);
export const union = mockSchemaValidator.union.bind(mockSchemaValidator);
export const literal = mockSchemaValidator.literal.bind(mockSchemaValidator);
export const validate = mockSchemaValidator.validate.bind(mockSchemaValidator);
export const openapi = mockSchemaValidator.openapi.bind(mockSchemaValidator);
