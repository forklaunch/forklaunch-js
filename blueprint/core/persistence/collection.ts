import { MarkedCollection } from '../types/markedCollection.types';

export function collection<T>(items: T[]): MarkedCollection<T> {
  return {
    _collection: true,
    items
  };
}
