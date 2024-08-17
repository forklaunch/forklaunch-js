import { TObject, Type } from '@sinclair/typebox';
import { Schema } from '../../index';
import {
  TypeboxSchemaValidator,
  array,
  bigint,
  boolean,
  date,
  empty,
  never,
  number,
  openapi,
  optional,
  parse,
  schemify,
  string,
  symbol,
  union,
  validate
} from '../../typebox/schemaValidator';
import { UnboxedTObjectSchema } from '../../typebox/types/schema.types';
import { compare } from '../utils/compare';

const one = array({
  name: {
    j: union([string, number, date, boolean, bigint, empty, symbol, never]),
    t: optional(
      union([
        array({
          y: array(number)
        }),
        string
      ])
    ),
    m: {
      a: optional(string),
      b: number,
      c: {
        d: string,
        e: number
      }
    }
  },
  200: {
    j: string
  },
  m: {
    a: true as const
  }
});
const two = array({
  name: {
    j: union([string, number, date, boolean, bigint, empty, symbol, never]),
    t: optional(
      union([
        array({
          y: array(number)
        }),
        string
      ])
    ),
    m: schemify({
      a: optional(string),
      b: number,
      c: {
        d: string,
        e: number
      }
    })
  },
  200: {
    j: string
  },
  m: {
    a: true as const
  }
});
const three = schemify(
  array(
    schemify({
      name: schemify({
        j: union([string, number, date, boolean, bigint, empty, symbol, never]),
        t: optional(
          union([
            array({
              y: array(number)
            }),
            string
          ])
        ),
        m: schemify({
          a: optional(string),
          b: number,
          c: {
            d: string,
            e: number
          }
        })
      }),
      200: schemify({
        j: string
      }),
      m: schemify({
        a: true as const
      })
    })
  )
);

export function assert<T extends never>() {}
type Equality<A, B> = Exclude<A, B> | Exclude<B, A>;

type Expected = {
  name: {
    j:
      | string
      | number
      | bigint
      | boolean
      | symbol
      | void
      | Date
      | null
      | undefined;
    t?:
      | string
      | {
          y: number[];
        }[]
      | undefined;
    m: {
      a?: string | undefined;
      b: number;
      c: {
        d: string;
        e: number;
      };
    };
  };
  200: {
    j: string;
  };
  m: {
    a: true;
  };
}[];

assert<Equality<SchemaThree, Expected>>();

type SchemaOne = Schema<typeof one, TypeboxSchemaValidator>;
type SchemaTwo = Schema<typeof two, TypeboxSchemaValidator>;
type SchemaThree = Schema<typeof three, TypeboxSchemaValidator>;

assert<Equality<SchemaOne, SchemaTwo>>();
assert<Equality<SchemaOne, SchemaThree>>();
assert<Equality<SchemaTwo, SchemaThree>>();

const shortOne = {
  s: string,
  non: number
};

const shortTwo = schemify({
  s: string,
  non: number
});

type ShortExpected = {
  s: string;
  non: number;
};
assert<
  Equality<Schema<typeof shortOne, TypeboxSchemaValidator>, ShortExpected>
>();
assert<
  Equality<
    Schema<typeof shortOne, TypeboxSchemaValidator>,
    Schema<typeof shortTwo, TypeboxSchemaValidator>
  >
>();

describe('Typebox Equality Tests', () => {
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
        world: Type.String()
      }),
      foo: Type.Object({
        bar: Type.Transform(
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
          .Encode(Number)
      })
    });
  });

  test('Schema Equality', async () => {
    expect(compare(schemified, expectedSchema));

    expect(
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
      )
    );
    expect(
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
      )
    );
    expect(
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
      )
    );
    expect(
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
      )
    );
  });

  test('Optional Schema Equality', async () => {
    const unboxSchemified = optional(schema);
    const boxSchemified = optional(schemified);

    const schemifiedExpected = Type.Optional(expectedSchema);
    expect(compare(unboxSchemified, schemifiedExpected));
    expect(compare(boxSchemified, schemifiedExpected));
  });

  test('Array Schema Equality', async () => {
    const unboxSchemified = array(schema);
    const boxSchemified = array(schemified);

    const schemifiedExpected = Type.Array(expectedSchema, {
      errorType: 'array of object'
    });
    expect(compare(unboxSchemified, schemifiedExpected));
    expect(compare(boxSchemified, schemifiedExpected));
  });

  test('Union Schema Equality', async () => {
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

    const schemifiedExpected = Type.Union([
      expectedSchema,
      Type.Object(
        {
          test: Type.String()
        },
        {
          errorSuffix: true,
          errorType: 'any of object, object'
        }
      )
    ]);

    expect(compare(unboxSchemified, schemifiedExpected));
    expect(compare(unboxSchemified2, schemifiedExpected));
    expect(compare(boxSchemified, schemifiedExpected));
    expect(compare(boxSchemified2, schemifiedExpected));
  });

  test('Literal Schema Equality', async () => {
    const schemified = schemify({
      hello: 'world'
    });
    expect(
      compare(
        schemified,
        Type.Object({
          hello: Type.Literal('world')
        })
      )
    );
  });

  test('Validate Schema', async () => {
    expect(
      validate(schemified, {
        hello: {
          world: 'world'
        },
        foo: {
          bar: 42
        }
      })
    ).toBe(true);

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

  test('Parse Schema', () => {
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
      expect(
        compare(validParse.value, {
          hello: {
            world: 'world'
          },
          foo: {
            bar: 42
          }
        })
      );
    }

    const failedParse = parse(schemified, {
      hello: {
        world: 55
      },
      foo: {}
    });
    expect(failedParse.ok).toBe(false);
    if (!failedParse.ok) {
      expect(failedParse.error)
        .toBe(`Validation failed with the following errors:
1. Path: hello > world
   Message: Expected string

2. Path: foo > bar
   Message: Expected required property

3. Path: foo > bar
   Message: Expected number-like value`);
    }
  });

  test('OpenAPI Conversion', async () => {
    const schemified = schemify(schema);
    const openApi = openapi(schemified);
    expect(openApi).toEqual(schemified);
  });
});
