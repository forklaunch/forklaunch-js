import { generateSchema } from "@anatine/zod-openapi"
import { ZodObject, z } from "zod"
import { Schema } from "../../index"
import { UnboxedObjectSchema } from "../../types/schema.types"
import { ZodSchemaValidator, array, bigint, boolean, date, empty, never, number, openapi, optional, schemify, string, symbol, union, validate } from "../../zod"
import { ZodCatchall, ZodObjectShape } from "../../zod/types/zod.schema.types"

const one = array({
    name: {
        j: union([string, number, date, boolean, bigint, empty, symbol, never]),
        t: optional(union([array({
            y: array(number)
        }), string])),
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
})
const two = array({
    name: {
        j: union([string, number, date, boolean, bigint, empty, symbol, never]),
        t: optional(union([array({
            y: array(number)
        }), string])),
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
})
const three = schemify(array(schemify({
    name: schemify({
        j: union([string, number, date, boolean, bigint, empty, symbol, never]),
        t: optional(union([array({
            y: array(number)
        }), string])),
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
})))

export function assert<T extends never>() {}
type Equality<A,B> = Exclude<A,B> | Exclude<B,A>;

type SchemaOne = Schema<typeof one, ZodSchemaValidator>;
type SchemaTwo = Schema<typeof two, ZodSchemaValidator>;
type SchemaThree = Schema<typeof three, ZodSchemaValidator>;

type Expected = {
    name: {
        j?: string | number | bigint | boolean | symbol | void | Date | null | undefined,
        t?: string | {
            y: number[]
        }[]| undefined,
        m: {
            a?: string | undefined,
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
        a: true
    }
}[];

assert<Equality<SchemaOne, Expected>>();
assert<Equality<SchemaOne, SchemaTwo>>();
assert<Equality<SchemaOne, SchemaThree>>();
assert<Equality<SchemaTwo, SchemaThree>>();

const shortOne = {
    s: string,
    non: number
}

const shortTwo = schemify({
    s: string,
    non: number
})

type ShortExpected = {
    s: string;
    non: number;
}
assert<Equality<Schema<typeof shortOne, ZodSchemaValidator>, ShortExpected>>();
assert<Equality<Schema<typeof shortOne, ZodSchemaValidator>, Schema<typeof shortTwo, ZodSchemaValidator>>>();

const compareSchemas = (schema1: ZodCatchall, schema2: ZodCatchall) => {
    return JSON.stringify(schema1) === JSON.stringify(schema2);
  };

describe('Zod Equality Tests', () => {
    let schema: UnboxedObjectSchema<ZodCatchall>
    let schemified: ZodObject<ZodObjectShape>
    let expectedSchema: ZodObject<ZodObjectShape>

    beforeAll(() => {
        schema = {
            hello: {
                world: string
            },
            foo: {
                bar: number
            }
        }
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

    test('Schema Equality', async () => {
        expect(compareSchemas(schemified, expectedSchema)).toBe(true);

        expect(compareSchemas(schemified, schemify({
            hello: {
                world: string
            },
            foo: {
                bar: number
            }
        }))).toBe(true);
        expect(compareSchemas(schemified, schemify({
            hello: schemify({
                world: string
            }),
            foo: {
                bar: number
            }
        }))).toBe(true);
        expect(compareSchemas(schemified, schemify({
            hello: {
                world: string
            },
            foo: schemify({
                bar: number
            })
        }))).toBe(true);
        expect(compareSchemas(schemified, schemify({
            hello: schemify({
                world: string
            }),
            foo: schemify({
                bar: number
            })
        }))).toBe(true);
    });

    test('Optional Schema Equality', async () => {
        const unboxSchemified = optional(schema);
        const boxSchemified = optional(schemified);

        const schemifiedExpected = z.optional(expectedSchema);
        expect(compareSchemas(unboxSchemified, schemifiedExpected)).toBe(true);
        expect(compareSchemas(boxSchemified, schemifiedExpected)).toBe(true);
    });

    test('Array Schema Equality', async () => {
        const unboxSchemified = array(schema);
        const boxSchemified = array(schemified);

        const schemifiedExpected = z.array(expectedSchema)
        expect(compareSchemas(unboxSchemified, schemifiedExpected)).toBe(true);
        expect(compareSchemas(boxSchemified, schemifiedExpected)).toBe(true);
 
    });

    test('Union Schema Equality', async () => {
        const unboxSchemified = union([schema, {
            test: string
        }]);
        const unboxSchemified2 = union([schema, schemify({
            test: string
        })]);
        const boxSchemified1 = union([schemified, schemify({
            test: string
        })]);
        const boxSchemified2 = union([schemified, {
            test: string
        }]);

        const schemifiedExpected = z.union([expectedSchema, z.object({
            test: z.string()
        })]);

        expect(compareSchemas(unboxSchemified, schemifiedExpected)).toBe(true);
        expect(compareSchemas(unboxSchemified2, schemifiedExpected)).toBe(true);
    });

    test('Literal Schema Equality', async () => {
        const schemified = schemify({
            hello: 'world'
        });
        expect(compareSchemas(schemified, z.object({
            hello: z.literal('world')
        }))).toBe(true);
    });

    test('Validate Schema', async () => {
        expect(validate(schemified, {
            hello: {
                world: 'world'
            },
            foo: {
                bar: 42
            }
        })).toBe(true);
        expect(validate(schemified, {
            hello: {
                world: 55
            },
            foo: {
                bar: 42
            }
        })).toBe(false);
    });

    test('OpenAPI Conversion', async () => {
        const schemified = schemify(schema);
        const openApi = openapi(schemified);
        expect(openApi).toEqual(generateSchema(schemified));
    });
})