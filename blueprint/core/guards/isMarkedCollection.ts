import { MarkedCollection } from '../types/markedCollection.types';

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
