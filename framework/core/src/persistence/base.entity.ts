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
  static async create<Entity extends BaseEntityWithId>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['create']>
  ): Promise<Entity> {
    const [data, ...additionalArgs] = args;
    const entity = new this();
    await entity.create(
      data as CreateShape<BaseEntityWithId, Entity>,
      ...additionalArgs
    );
    return entity;
  }

  /**
   * Static method to update an entity instance.
   *
   * @template Entity - The type of entity being updated
   * @param {Constructor<Entity>} this - The entity constructor
   * @param {...Parameters<Entity['update']>} args - Arguments for entity update
   * @returns {Entity} The updated entity instance
   */
  static async update<Entity extends BaseEntityWithId>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['update']>
  ): Promise<Entity> {
    const [data, ...additionalArgs] = args;
    const entity = new this();
    await entity.update(
      data as UpdateShape<BaseEntity, Entity>,
      ...additionalArgs
    );
    return entity;
  }

  /**
   * Static method to map data to an entity instance.
   *
   * @template Entity - The type of entity being mapped
   * @param {Constructor<Entity>} this - The entity constructor
   * @param {Partial<EntityDTO<FromEntityType<Entity>>>} data - The data to map
   * @returns {Entity} A new entity instance with mapped data
   */
  static async map<Entity extends BaseEntity>(
    this: Constructor<Entity>,
    data: Partial<EntityDTO<FromEntityType<Entity>>>
  ): Promise<Entity> {
    const entity = new this();
    await entity.map(data);
    return entity;
  }

  /**
   * Creates a new entity instance with the provided data.
   *
   * @param {CreateShape<BaseEntityWithId, this>} data - The data to create the entity with
   * @returns {this} The created entity instance
   */
  async create(
    data: CreateShape<BaseEntityWithId, this>
  ): Promise<EntityDTO<this>> {
    Object.assign(this, transformRawDto(data, this));
    const entity = await wrap(this).init();
    if (!entity) {
      throw new Error('Entity not initialized');
    }
    return entity.toObject();
  }

  /**
   * Updates the entity instance with the provided data.
   *
   * @param {UpdateShape<BaseEntityWithId, this>} data - The data to update the entity with
   * @returns {this} The updated entity instance
   */
  async update(
    data: UpdateShape<BaseEntityWithId, this>
  ): Promise<EntityDTO<this>> {
    const entity = wrap(this);
    entity.assign(
      stripUndefinedProperties(transformRawDto(data, this)) as Partial<
        EntityDTO<FromEntityType<this>>
      >
    );
    return entity.toObject();
  }

  /**
   * Reads the entity data as a plain object.
   *
   * @returns {EntityDTO<this> | this} The entity data as a plain object
   */
  async read(): Promise<EntityDTO<this>> {
    const entity = await wrap(this).init();
    if (!entity) {
      throw new Error('Entity not initialized');
    }
    return entity.toObject();
  }

  /**
   * Maps data to the entity instance.
   *
   * @param {Partial<EntityDTO<FromEntityType<this>>>} data - The data to map
   * @returns {this} The entity instance with mapped data
   */
  async map(data: Partial<EntityDTO<FromEntityType<this>>>): Promise<this> {
    const entity = await wrap(this).init();

    if (!entity) {
      throw new Error('Entity not initialized');
    }
    entity.assign(data);
    return entity;
  }
}
