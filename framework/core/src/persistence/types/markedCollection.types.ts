/**
 * Type representing a marked collection of items.
 * A marked collection is a wrapper around an array that indicates it should be treated as a collection.
 *
 * @template T - The type of items in the collection
 * @property {true} _collection - Marker indicating this is a collection
 * @property {T[]} items - The array of items in the collection
 */
export type MarkedCollection<T> = {
  _collection: true;
  items: T[];
};
