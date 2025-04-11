import { stripUndefinedProperties } from '@forklaunch/common';
import {
  BaseEntity,
  Constructor,
  EntityDTO,
  FromEntityType,
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
  wrap
} from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { CreateShape, UpdateShape } from '../types/shapes.types';
import { transformRawDto } from './transformRawDto';

/**
 * Abstract class representing a base entity.
 */
export abstract class NoSqlBaseEntity extends BaseEntity {
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

  static create<Entity extends NoSqlBaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['create']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().create(
      data as CreateShape<NoSqlBaseEntity, Entity>,
      ...additionalArgs
    );
  }

  static update<Entity extends NoSqlBaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['update']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().update(
      data as UpdateShape<NoSqlBaseEntity, Entity>,
      ...additionalArgs
    );
  }

  static map<Entity extends NoSqlBaseEntity>(
    this: Constructor<Entity>,
    data: Partial<EntityDTO<FromEntityType<Entity>>>
  ): Entity {
    return new this().map(data);
  }

  create(data: CreateShape<NoSqlBaseEntity, this>): this {
    return Object.assign(this, transformRawDto(data, this));
  }

  update(data: UpdateShape<NoSqlBaseEntity, this>): this {
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
