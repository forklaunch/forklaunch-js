import { Collection } from '@mikro-orm/core';
import { MarkedCollection } from '../persistence/base.entity';

export type CreateShape<BaseEntity, T> = {
  [K in keyof Omit<T, keyof BaseEntity>]: T[K] extends Collection<infer U>
    ? MarkedCollection<U>
    : T[K];
};

export type UpdateShape<BaseEntity, T> = Partial<
  CreateShape<BaseEntity, T> & { id: string }
>;
