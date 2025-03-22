/**
 * A type that "prettifies" the structure of an object type `T`.
 *
 * This utility type takes an object type `T` and re-maps its keys and values, effectively creating
 * a new type with the same keys and values but without any extra type information or attributes.
 * This can be useful for simplifying the displayed type information in development tools.
 *
 * @template T - The object type to prettify.
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
