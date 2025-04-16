import { stripUndefinedProperties } from '@forklaunch/common';
import {
  Constructor,
  EntityDTO,
  FromEntityType,
  BaseEntity as MikroOrmBaseEntity,
  wrap
} from '@mikro-orm/core';
import { transformRawDto } from './transformRawDto';
import { CreateShape, UpdateShape } from './types/shapes.types';

/**
 * Type representing a base entity with common fields.
 * Extends BaseEntity with optional id, _id, createdAt, and updatedAt fields.
 */
type BaseEntityWithId = BaseEntity & {
  id?: unknown;
  _id?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/**
 * Abstract base class for all entities in the system.
 * Extends MikroORM's BaseEntity and provides common CRUD operations.
 */
export abstract class BaseEntity extends MikroOrmBaseEntity {
  /**
   * Static factory method to create a new entity instance.
   *
   * @template Entity - The type of entity being created
   * @param {Constructor<Entity>} this - The entity constructor
   * @param {...Parameters<Entity['create']>} args - Arguments for entity creation
   * @returns {Entity} A new entity instance
   */
  static create<Entity extends BaseEntityWithId>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['create']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().create(
      data as CreateShape<BaseEntityWithId, Entity>,
      ...additionalArgs
    );
  }

  /**
   * Static method to update an entity instance.
   *
   * @template Entity - The type of entity being updated
   * @param {Constructor<Entity>} this - The entity constructor
   * @param {...Parameters<Entity['update']>} args - Arguments for entity update
   * @returns {Entity} The updated entity instance
   */
  static update<Entity extends BaseEntityWithId>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['update']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().update(
      data as UpdateShape<BaseEntity, Entity>,
      ...additionalArgs
    );
  }

  /**
   * Static method to map data to an entity instance.
   *
   * @template Entity - The type of entity being mapped
   * @param {Constructor<Entity>} this - The entity constructor
   * @param {Partial<EntityDTO<FromEntityType<Entity>>>} data - The data to map
   * @returns {Entity} A new entity instance with mapped data
   */
  static map<Entity extends BaseEntity>(
    this: Constructor<Entity>,
    data: Partial<EntityDTO<FromEntityType<Entity>>>
  ): Entity {
    return new this().map(data);
  }

  /**
   * Creates a new entity instance with the provided data.
   *
   * @param {CreateShape<BaseEntityWithId, this>} data - The data to create the entity with
   * @returns {this} The created entity instance
   */
  create(data: CreateShape<BaseEntityWithId, this>): this {
    return Object.assign(this, transformRawDto(data, this));
  }

  /**
   * Updates the entity instance with the provided data.
   *
   * @param {UpdateShape<BaseEntityWithId, this>} data - The data to update the entity with
   * @returns {this} The updated entity instance
   */
  update(data: UpdateShape<BaseEntityWithId, this>): this {
    wrap(this).assign(
      stripUndefinedProperties(transformRawDto(data, this)) as Partial<
        EntityDTO<FromEntityType<this>>
      >
    );
    return this;
  }

  /**
   * Reads the entity data as a plain object.
   *
   * @returns {EntityDTO<this> | this} The entity data as a plain object
   */
  read(): EntityDTO<this> | this {
    if (typeof wrap(this).toPOJO === 'function') {
      return wrap(this).toPOJO();
    }
    return this;
  }

  /**
   * Maps data to the entity instance.
   *
   * @param {Partial<EntityDTO<FromEntityType<this>>>} data - The data to map
   * @returns {this} The entity instance with mapped data
   */
  map(data: Partial<EntityDTO<FromEntityType<this>>>): this {
    wrap(this).assign(data);
    return this;
  }
}
