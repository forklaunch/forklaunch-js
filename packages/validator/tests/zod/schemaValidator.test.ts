import { generateSchema } from '@anatine/zod-openapi';
import { ZodObject, z } from 'zod';
import { UnboxedObjectSchema } from '../../src/shared/types/schema.types';
import {
  array,
  number,
  openapi,
  optional,
  parse,
  schemify,
  string,
  union,
  validate
} from '../../src/zod';
import { ZodObjectShape } from '../../src/zod/types/schema.types';
import { ZodSchemaValidator } from '../../src/zod/zodSchemaValidator';
import { compare } from '../utils/compare';

describe('zod schema validator tests', () => {
  let schema: UnboxedObjectSchema<ZodSchemaValidator>;
  let schemified: ZodObject<ZodObjectShape>;
  let expectedSchema: ZodObject<ZodObjectShape>;

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
    expectedSchema = z.object({
      hello: z.object({
        world: z.string()
      }),
      foo: z.object({
        bar: z.number()
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

    const schemifiedExpected = z.optional(expectedSchema);
    compare(unboxSchemified, schemifiedExpected);
    compare(boxSchemified, schemifiedExpected);
  });

  test('array', async () => {
    const unboxSchemified = array(schema);
    const boxSchemified = array(schemified);

    const schemifiedExpected = z.array(expectedSchema);
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

    const schemifiedExpected = z.union([
      expectedSchema,
      z.object({
        test: z.string()
      })
    ]);

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
      z.object({
        hello: z.literal('world')
      })
    );
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
        foo: {}
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
      expect(failedParse.error)
        .toBe(`Validation failed with the following errors:
1. Path: hello > world
   Message: Expected string, received number

2. Path: foo > bar
   Message: Expected number, received nan`);
    }
  });

  test('openapi', async () => {
    const schemified = schemify(schema);
    const openApi = openapi(schemified);
    expect(openApi).toEqual(generateSchema(schemified));
  });
});
