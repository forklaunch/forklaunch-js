import { MarkedCollection } from './types/markedCollection.types';

/**
 * Creates a marked collection from an array of items.
 * A marked collection is a wrapper around an array that indicates it should be treated as a collection.
 *
 * @template T - The type of items in the collection
 * @param {T[]} items - The array of items to wrap in a collection
 * @returns {MarkedCollection<T>} A marked collection containing the provided items
 * @example
 * const users = collection([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]);
 */
export function collection<T>(items: T[]): MarkedCollection<T> {
  return {
    _collection: true,
    items
  };
}
