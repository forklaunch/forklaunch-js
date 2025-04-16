import { BaseEntity, Collection } from '@mikro-orm/core';
import { isMarkedCollection } from './guards/isMarkedCollection';

/**
 * Transforms a raw DTO (Data Transfer Object) by converting marked collections into MikroORM collections.
 * This function is used to properly handle collections when converting between DTOs and entities.
 *
 * @template T - The type of the DTO being transformed
 * @template U - The type of the entity being transformed into
 * @param {T} data - The raw DTO data to transform
 * @param {U} entity - The entity instance to associate collections with
 * @returns {T} The transformed DTO with collections properly initialized
 * @example
 * const dto = { users: { _collection: true, items: [{ id: 1 }] } };
 * const entity = new UserEntity();
 * const transformed = transformRawDto(dto, entity);
 * // transformed.users is now a MikroORM Collection
 */
export function transformRawDto<
  T extends Record<string, unknown>,
  U extends BaseEntity
>(data: T, entity: U): T {
  const transformedObject: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isMarkedCollection<object>(value)) {
      transformedObject[key] = new Collection(entity, value.items);
    } else {
      transformedObject[key] = value;
    }
  }
  return transformedObject as T;
}
