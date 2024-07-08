import { SchemaObject } from 'openapi3-ts/oas31';
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

type RecursiveUnion<T extends readonly string[]> = T extends readonly [
  infer F extends string,
  ...infer R extends readonly string[]
]
  ? R extends []
    ? F
    : `${F} | ${RecursiveUnion<R>}`
  : '';

export class MockSchemaValidator
  implements
    SchemaValidator<
      <T extends string>(schema: T) => T,
      <T extends string>(schema: T) => `optional ${T}`,
      <T extends string>(schema: T) => `array ${T}`,
      <T extends readonly string[]>(schemas: T) => RecursiveUnion<T>,
      <T extends LiteralSchema>(schema: T) => `literal ${T}`,
      <T extends string>(schema: T, value: string) => boolean,
      <T extends string>(schema: T) => SchemaObject
    >
{
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
  optional<T extends string>(schema: T): `optional ${T}` {
    return ('optional ' + schema) as `optional ${T}`;
  }
  array<T extends string>(schema: T): `array ${T}` {
    return ('array ' + schema) as `array ${T}`;
  }
  union<T extends readonly string[]>(schemas: T): RecursiveUnion<T> {
    return schemas.join(' | ') as RecursiveUnion<T>;
  }
  literal<T extends LiteralSchema>(schema: T): `literal ${T}` {
    return `literal ${schema}`;
  }
  validate<T extends string>(schema: T, value: string): boolean {
    return true;
  }
  openapi<T extends string>(schema: T): SchemaObject {
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
// note, use 'as const' when calling on the input array, for proper type coercion
export const union = mockSchemaValidator.union.bind(mockSchemaValidator);
export const literal = mockSchemaValidator.literal.bind(mockSchemaValidator);
export const validate = mockSchemaValidator.validate.bind(mockSchemaValidator);
export const openapi = mockSchemaValidator.openapi.bind(mockSchemaValidator);
