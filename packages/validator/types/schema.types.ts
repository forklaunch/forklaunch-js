/**
 * Represents a schema for an unboxed object where each key can have an idiomatic schema.
 * 
 * @template Catchall - The type to use for catch-all cases in the schema.
 */
export type UnboxedObjectSchema<Catchall> = {
    [key: KeyTypes]: IdiomaticSchema<Catchall>;
};

/**
 * Represents a schema that can be a literal value.
 */
export type LiteralSchema = string | number | boolean;

/**
 * Represents an idiomatic schema which can be an unboxed object schema, a literal schema, or a catch-all type.
 * 
 * @template Catchall - The type to use for catch-all cases in the schema.
 */
export type IdiomaticSchema<Catchall> = UnboxedObjectSchema<Catchall> | LiteralSchema | Catchall;

/**
 * Increments a number type by one, with support up to 50.
 * 
 * @template T - The number type to increment.
 */
export type Increment<T extends number> = 
    T extends 0 ? 1 :
    T extends 1 ? 2 :
    T extends 2 ? 3 :
    T extends 3 ? 4 :
    T extends 4 ? 5 :
    T extends 5 ? 6 :
    T extends 6 ? 7 :
    T extends 7 ? 8 :
    T extends 8 ? 9 :
    T extends 9 ? 10 :
    T extends 10 ? 11 :
    T extends 11 ? 12 :
    T extends 12 ? 13 :
    T extends 13 ? 14 :
    T extends 14 ? 15 :
    T extends 15 ? 16 :
    T extends 16 ? 17 :
    T extends 17 ? 18 :
    T extends 18 ? 19 :
    T extends 19 ? 20 :
    T extends 20 ? 21 :
    T extends 21 ? 22 :
    T extends 22 ? 23 :
    T extends 23 ? 24 :
    T extends 24 ? 25 :
    T extends 25 ? 26 :
    T extends 26 ? 27 :
    T extends 27 ? 28 :
    T extends 28 ? 29 :
    T extends 29 ? 30 :
    T extends 30 ? 31 :
    T extends 31 ? 32 :
    T extends 32 ? 33 :
    T extends 33 ? 34 :
    T extends 34 ? 35 :
    T extends 35 ? 36 :
    T extends 36 ? 37 :
    T extends 37 ? 38 :
    T extends 38 ? 39 :
    T extends 39 ? 40 :
    T extends 40 ? 41 :
    T extends 41 ? 42 :
    T extends 42 ? 43 :
    T extends 43 ? 44 :
    T extends 44 ? 45 :
    T extends 45 ? 46 :
    T extends 46 ? 47 :
    T extends 47 ? 48 :
    T extends 48 ? 49 :
    T extends 49 ? 50 :
    50;

/**
 * Represents key types that can be used in the schema.
 */
export type KeyTypes = string | number;
