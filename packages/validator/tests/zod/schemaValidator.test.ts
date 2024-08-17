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
    expect(compare(schemified, expectedSchema)).toBe(true);

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
    ).toBe(true);
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
    ).toBe(true);
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
    ).toBe(true);
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
    ).toBe(true);
  });

  test('optional', async () => {
    const unboxSchemified = optional(schema);
    const boxSchemified = optional(schemified);

    const schemifiedExpected = z.optional(expectedSchema);
    expect(compare(unboxSchemified, schemifiedExpected)).toBe(true);
    expect(compare(boxSchemified, schemifiedExpected)).toBe(true);
  });

  test('array', async () => {
    const unboxSchemified = array(schema);
    const boxSchemified = array(schemified);

    const schemifiedExpected = z.array(expectedSchema);
    expect(compare(unboxSchemified, schemifiedExpected)).toBe(true);
    expect(compare(boxSchemified, schemifiedExpected)).toBe(true);
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

    expect(compare(unboxSchemified, schemifiedExpected)).toBe(true);
    expect(compare(unboxSchemified2, schemifiedExpected)).toBe(true);
    expect(compare(boxSchemified, schemifiedExpected)).toBe(true);
    expect(compare(boxSchemified2, schemifiedExpected)).toBe(true);
  });

  test('literal', async () => {
    const schemified = schemify({
      hello: 'world'
    });
    expect(
      compare(
        schemified,
        z.object({
          hello: z.literal('world')
        })
      )
    ).toBe(true);
  });

  test('validate', async () => {
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
