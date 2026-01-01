import {
  Constructor,
  EntityData,
  EntityDTO,
  EntityManager,
  BaseEntity as MikroORMBaseEntity,
  RequiredEntityData,
  wrap
} from '@mikro-orm/core';

/**
 * BaseEntity class extending MikroORM's BaseEntity to provide
 * convenience static methods for entity creation, updating, and reading.
 */
export class BaseEntity extends MikroORMBaseEntity {
  /**
   * Create a new entity instance with the given data.
   *
   * @template T - Entity type extending BaseEntity
   * @param this - The constructor of the entity
   * @param data - Data required to create the entity
   * @param em - Optional MikroORM EntityManager. If passed, this will call em.create()
   * @returns A promise resolving to the created entity
   */
  static async create<T extends BaseEntity>(
    this: Constructor<T>,
    data: RequiredEntityData<T>,
    em?: EntityManager,
    ...constructorArgs: ConstructorParameters<Constructor<T>>
  ): Promise<T> {
    const instance = new this(...constructorArgs);
    if (em) {
      return em.create(this, data);
    } else {
      Object.assign(instance, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return instance;
  }

  /**
   * Update an existing entity instance with the given data.
   *
   * @template T - Entity type extending BaseEntity
   * @param this - The constructor of the entity
   * @param data - Partial data to update the entity. Must include 'id' field to identify the entity.
   * @param em - Optional MikroORM EntityManager. If passed, fetches existing entity and applies partial update
   * @returns A promise resolving to the updated entity
   * @throws Error if entity with given id is not found (when em is provided)
   */
  static async update<T extends BaseEntity>(
    this: Constructor<T>,
    data: EntityData<T> & { id: unknown },
    em?: EntityManager,
    ...constructorArgs: ConstructorParameters<Constructor<T>>
  ): Promise<T> {
    const instance = new this(...constructorArgs);
    if (em) {
      const existingEntity = await em.findOneOrFail(this, { id: data.id });

      const { id, ...updateData } = data as Record<string, unknown>;
      void id;

      em.assign(existingEntity, {
        ...updateData,
        updatedAt: new Date()
      });

      return existingEntity;
    } else {
      Object.assign(instance, {
        ...data,
        updatedAt: new Date()
      });
    }
    return instance;
  }

  /**
   * Reads the entity, initializing it if necessary, and returns its DTO representation.
   *
   * @param em - Optional MikroORM EntityManager for initialization. If passed, entity will synchronize with database
   * @returns A promise resolving to the entity's DTO (plain object representation)
   * @throws Error if the entity is not initialized and no EntityManager is provided
   */
  async read(em?: EntityManager): Promise<EntityDTO<this>> {
    if (em && !this.isInitialized()) {
      await this.init({ em });
    }
    return wrap(this).toPOJO();
  }
}
