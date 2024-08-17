/**
 * A type that represents the values of an object type `T`.
 * 
 * This utility type takes an object type `T` and produces a union of its value types.
 * 
 * @template T - The object type to extract values from.
 */
export type FlattenValues<T> = T[keyof T];

/**
 * A type that represents the keys of an object type `T`.
 * 
 * This utility type takes an object type `T` and produces a union of its key types.
 * 
 * @template T - The object type to extract keys from.
 */
export type FlattenKeys<T> = keyof T;