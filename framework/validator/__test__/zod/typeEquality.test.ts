/* eslint-disable @typescript-eslint/no-unused-vars */
import { Schema } from '../../index';
import {
  array,
  bigint,
  binary,
  boolean,
  date,
  file,
  never,
  nullish,
  number,
  optional,
  schemify,
  string,
  symbol,
  union
} from '../../src/zod';
import { ZodSchemaValidator } from '../../src/zod/zodSchemaValidator';

const one = array({
  name: {
    j: union([string, number, date, boolean, bigint, nullish, symbol, never]),
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
    j: union([string, number, date, boolean, bigint, nullish, symbol, never]),
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
        j: union([
          string,
          number,
          date,
          boolean,
          bigint,
          nullish,
          symbol,
          never
        ]),
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

type SchemaOne = Schema<typeof one, ZodSchemaValidator>;
type SchemaTwo = Schema<typeof two, ZodSchemaValidator>;
type SchemaThree = Schema<typeof three, ZodSchemaValidator>;

type Expected = {
  name: {
    j?:
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

assert<Equality<SchemaOne, Expected>>();
assert<Equality<SchemaOne, SchemaTwo>>();
assert<Equality<SchemaOne, SchemaThree>>();
assert<Equality<SchemaTwo, SchemaThree>>();

const shortOne = {
  s: string,
  non: number,
  b: binary,
  f: file
};

const shortTwo = schemify({
  s: string,
  non: number,
  b: binary,
  f: file
});

type ShortExpected = {
  s: string;
  non: number;
  b: Uint8Array;
  f: Blob;
};

assert<Equality<Schema<typeof shortOne, ZodSchemaValidator>, ShortExpected>>();
assert<
  Equality<
    Schema<typeof shortOne, ZodSchemaValidator>,
    Schema<typeof shortTwo, ZodSchemaValidator>
  >
>();
