import { MarkedCollection } from '../types/markedCollection.types';

/**
 * Type guard function that checks if a value is a marked collection.
 *
 * @template T - The type of items in the collection
 * @param {unknown} value - The value to check
 * @returns {value is MarkedCollection<T>} True if the value is a marked collection, false otherwise
 * @example
 * const value = { _collection: true, items: [1, 2, 3] };
 * if (isMarkedCollection<number>(value)) {
 *   // value is now typed as MarkedCollection<number>
 *   console.log(value.items); // [1, 2, 3]
 * }
 */
export function isMarkedCollection<T>(
  value: unknown
): value is MarkedCollection<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_collection' in value &&
    typeof value._collection === 'boolean' &&
    value._collection
  );
}
