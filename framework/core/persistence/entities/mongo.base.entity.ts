import { stripUndefinedProperties } from '@forklaunch/common';
import {
  Constructor,
  EntityDTO,
  FromEntityType,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  wrap
} from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { CreateShape, UpdateShape } from '../types/shapes';

/**
 * Abstract class representing a base entity.
 */
export abstract class MongoBaseEntity {
  /**
   * The serialized unique identifier for the entity.
   *
   * @type {string}
   * @readonly
   */
  @PrimaryKey()
  _id!: ObjectId;

  /**
   * The unique identifier for the entity.
   *
   * @type {string}
   * @readonly
   */
  @SerializedPrimaryKey()
  id!: string;

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

  static create<Entity extends MongoBaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['create']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().create(
      data as CreateShape<MongoBaseEntity, Entity>,
      ...additionalArgs
    );
  }

  static update<Entity extends MongoBaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['update']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().update(
      data as UpdateShape<MongoBaseEntity, Entity>,
      ...additionalArgs
    );
  }

  create(data: CreateShape<MongoBaseEntity, this>): this {
    Object.assign(this, data);
    return this;
  }

  update(data: UpdateShape<MongoBaseEntity, this>): this {
    wrap(this).assign(
      stripUndefinedProperties(data) as Partial<EntityDTO<FromEntityType<this>>>
    );
    return this;
  }

  read(): EntityDTO<this> {
    return wrap(this).toPOJO();
  }
}
