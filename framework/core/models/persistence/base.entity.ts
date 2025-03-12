import { stripUndefinedProperties } from '@forklaunch/common';
import {
  Collection,
  Constructor,
  EntityDTO,
  FromEntityType,
  PrimaryKey,
  Property,
  wrap
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { CreateShape, UpdateShape } from '../types/shapes';

/**
 * Abstract class representing a base entity.
 */
export abstract class BaseEntity {
  /**
   * The unique identifier for the entity.
   *
   * @type {string}
   * @readonly
   */
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  /**
   * The date when the entity was created.
   *
   * @type {Date}
   */
  @Property()
  createdAt: Date = new Date();

  /**
   * The date when the entity was last updated.
   *
   * @type {Date}
   * @readonly
   */
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  static create<Entity extends BaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['create']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().create(
      data as CreateShape<BaseEntity, Entity>,
      ...additionalArgs
    );
  }

  static update<Entity extends BaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['update']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().update(
      data as UpdateShape<BaseEntity, Entity>,
      ...additionalArgs
    );
  }

  static map<Entity extends BaseEntity>(
    this: Constructor<Entity>,
    data: Partial<EntityDTO<FromEntityType<Entity>>>
  ): Entity {
    return new this().map(data);
  }

  create(data: CreateShape<BaseEntity, this>): this {
    return Object.assign(this, transformRawDto(data, this));
  }

  update(data: UpdateShape<BaseEntity, this>): this {
    wrap(this).assign(
      stripUndefinedProperties(transformRawDto(data, this)) as Partial<
        EntityDTO<FromEntityType<this>>
      >
    );
    return this;
  }

  read(): EntityDTO<this> | this {
    if (typeof wrap(this).toPOJO === 'function') {
      return wrap(this).toPOJO();
    }
    return this;
  }

  map(data: Partial<EntityDTO<FromEntityType<this>>>): this {
    wrap(this).assign(data);
    return this;
  }
}

function transformRawDto<
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

function isMarkedCollection<T>(value: unknown): value is MarkedCollection<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_collection' in value &&
    typeof value._collection === 'boolean' &&
    value._collection
  );
}

export type MarkedCollection<T> = {
  _collection: true;
  items: T[];
};

export function collection<T>(items: T[]): MarkedCollection<T> {
  return {
    _collection: true,
    items
  };
}
