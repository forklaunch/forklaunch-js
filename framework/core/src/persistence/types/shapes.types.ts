import { Collection } from '@mikro-orm/core';
import { MarkedCollection } from './markedCollection.types';

/**
 * Type representing the shape of data used to create an entity.
 * Converts MikroORM collections to marked collections and omits entity properties.
 *
 * @template Entity - The base entity type
 * @template T - The type being created
 */
export type CreateShape<Entity, T> = {
  [K in keyof Omit<T, keyof Entity>]: T[K] extends Collection<infer U>
    ? MarkedCollection<U>
    : T[K];
};

/**
 * Type representing the shape of data used to update an entity.
 * Similar to CreateShape but makes all properties optional and includes an id field.
 *
 * @template Entity - The base entity type
 * @template T - The type being updated
 */
export type UpdateShape<Entity, T> = Partial<
  CreateShape<Entity, T> & { id: string }
>;
