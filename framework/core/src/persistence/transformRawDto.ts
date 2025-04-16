import { BaseEntity, Collection } from '@mikro-orm/core';
import { isMarkedCollection } from './guards/isMarkedCollection';

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
