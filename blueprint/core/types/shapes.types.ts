import { Collection } from '@mikro-orm/core';
import { MarkedCollection } from './markedCollection.types';

export type CreateShape<Entity, T> = {
  [K in keyof Omit<T, keyof Entity>]: T[K] extends Collection<infer U>
    ? MarkedCollection<U>
    : T[K];
};

export type UpdateShape<Entity, T> = Partial<
  CreateShape<Entity, T> & { id: string }
>;
