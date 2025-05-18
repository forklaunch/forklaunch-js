import { TObject, Type } from '@sinclair/typebox';
import { prettyPrintParseErrors } from '../../src/shared/utils/prettyPrintParseErrors';
import {
  array,
  enum_,
  function_,
  isSchema,
  number,
  openapi,
  optional,
  parse,
  promise,
  record,
  schemify,
  string,
  union,
  validate
} from '../../src/typebox/staticSchemaValidator';
import { UnboxedTObjectSchema } from '../../src/typebox/types/schema.types';
import { compare } from '../utils/compare';

describe('typebox schema validator tests', () => {
  let schema: UnboxedTObjectSchema;
  let schemified: TObject;
  let expectedSchema: TObject;

  beforeAll(() => {
    schema = {
      hello: {
        world: string
      },
      foo: {
        bar: number
      }
    };
    schemified = schemify(schema);
    expectedSchema = Type.Object({
      hello: Type.Object({
        world: Type.String({
          examples: ['a string']
        })
      }),
      foo: Type.Object({
        bar: Type.Transform(
          Type.Union(
            [
              Type.Number(),
              Type.String({ pattern: '^[0-9]+$' }),
              Type.Boolean(),
              Type.Null(),
              Type.BigInt(),
              Type.Date()
            ],
            {
              errorType: 'number-like',
              openapiType: Type.Number(),
              examples: [123]
            }
          )
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
          .Encode(Number)
      })
    });
  });

  test('schemify', async () => {
    compare(schemified, expectedSchema);

    compare(
      schemified,
      schemify({
        hello: {
          world: string
        },
        foo: {
          bar: number
        }
      })
    );

    compare(
      schemified,
      schemify({
        hello: schemify({
          world: string
        }),
        foo: {
          bar: number
        }
      })
    );

    compare(
      schemified,
      schemify({
        hello: {
          world: string
        },
        foo: schemify({
          bar: number
        })
      })
    );

    compare(
      schemified,
      schemify({
        hello: schemify({
          world: string
        }),
        foo: schemify({
          bar: number
        })
      })
    );
  });

  test('optional', async () => {
    const unboxSchemified = optional(schema);
    const boxSchemified = optional(schemified);

    const schemifiedExpected = Type.Optional(expectedSchema);
    compare(unboxSchemified, schemifiedExpected);
    compare(boxSchemified, schemifiedExpected);
  });

  test('array', async () => {
    const unboxSchemified = array(schema);
    const boxSchemified = array(schemified);

    const schemifiedExpected = Type.Array(expectedSchema, {
      errorType: 'array of object'
    });
    compare(unboxSchemified, schemifiedExpected);
    compare(boxSchemified, schemifiedExpected);
  });

  test('union', async () => {
    const unboxSchemified = union([
      schema,
      {
        test: string
      }
    ]);
    const unboxSchemified2 = union([
      schema,
      schemify({
        test: string
      })
    ]);
    const boxSchemified = union([
      schemified,
      schemify({
        test: string
      })
    ]);
    const boxSchemified2 = union([
      schemified,
      {
        test: string
      }
    ]);

    const schemifiedExpected = Type.Union(
      [
        expectedSchema,
        Type.Object({
          test: Type.String({ examples: ['a string'] })
        })
      ],
      {
        errorType: 'any of object, object',
        errorSuffix: true
      }
    );

    compare(unboxSchemified, schemifiedExpected);
    compare(unboxSchemified2, schemifiedExpected);
    compare(boxSchemified, schemifiedExpected);
    compare(boxSchemified2, schemifiedExpected);
  });

  test('literal', async () => {
    const schemified = schemify({
      hello: 'world'
    });

    compare(
      schemified,
      Type.Object({
        hello: Type.Literal('world')
      })
    );
  });

  test('enum', async () => {
    enum TestSingleEnum {
      WORLD = 'world'
    }
    const schemified = enum_(TestSingleEnum);

    compare(
      schemified,
      Type.Literal('world', {
        errorType: 'world',
        errorSuffix: true
      })
    );

    enum TestMultipleEnum {
      WORLD = 'world',
      HELLO = 'hello'
    }
    const schemifiedMultiple = enum_(TestMultipleEnum);

    compare(
      schemifiedMultiple,
      Type.Union(
        [
          Type.Literal('world', {
            errorType: 'world'
          }),
          Type.Literal('hello', {
            errorType: 'hello'
          })
        ],
        { errorType: 'any of world, hello', errorSuffix: true }
      )
    );
  });

  test('function', async () => {
    const schemified = function_([Type.String(), Type.Number()], Type.String());

    compare(
      schemified,
      Type.Function([Type.String(), Type.Number()], Type.String())
    );
  });

  test('record', async () => {
    const schemified = record(Type.String(), Type.Number());

    compare(schemified, Type.Record(Type.String(), Type.Number()));
  });

  test('promise', async () => {
    const schemified = promise(Type.String());

    compare(schemified, Type.Promise(Type.String()));
  });

  test('isSchema', () => {
    expect(isSchema(Type.String())).toBe(true);
    expect(isSchema(Type.Number())).toBe(true);
    expect(
      isSchema(
        Type.Object({
          foo: Type.String()
        })
      )
    ).toBe(true);
    expect(isSchema(Type.Array(Type.String()))).toBe(true);

    expect(isSchema('not a schema')).toBe(false);
    expect(isSchema(42)).toBe(false);
    expect(isSchema({})).toBe(false);
    expect(isSchema(null)).toBe(false);
    expect(isSchema(undefined)).toBe(false);
  });

  test('validate', async () => {
    validate(schemified, {
      hello: {
        world: 'world'
      },
      foo: {
        bar: 42
      }
    });

    expect(
      validate(schemified, {
        hello: {
          world: 55
        },
        foo: {
          bar: 42
        }
      })
    ).toBe(false);
  });

  test('parse', () => {
    const validParse = parse(schemified, {
      hello: {
        world: 'world'
      },
      foo: {
        bar: 42
      }
    });
    expect(validParse.ok).toBe(true);
    if (validParse.ok) {
      compare(validParse.value, {
        hello: {
          world: 'world'
        },
        foo: {
          bar: 42
        }
      });
    }

    const failedParse = parse(schemified, {
      hello: {
        world: 55
      },
      foo: {}
    });
    expect(failedParse.ok).toBe(false);
    if (!failedParse.ok) {
      expect(prettyPrintParseErrors(failedParse.errors))
        .toBe(`Validation failed with the following errors:
1. Path: hello > world
   Message: Expected string

2. Path: foo > bar
   Message: Expected required property

3. Path: foo > bar
   Message: Expected number-like value`);
    }
  });

  test('openapi', async () => {
    const mutation = schemify(schema);
    compare(
      openapi(schema),
      Type.Object({
        hello: Type.Object({
          world: Type.String({ examples: ['a string'] })
        }),
        foo: Type.Object({
          bar: Type.Number()
        })
      })
    );
    // ensure that no mutation has occurred to schema
    compare(schemify(schema), mutation);
  });
});
