import { stripUndefinedProperties } from '@forklaunch/common';
import {
  BaseEntity,
  Constructor,
  EntityDTO,
  FromEntityType,
  PrimaryKey,
  Property,
  wrap
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { CreateShape, UpdateShape } from '../types/shapes.types';
import { transformRawDto } from './transformRawDto';

/**
 * Abstract class representing a base entity.
 */
export abstract class SqlBaseEntity extends BaseEntity {
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

  static create<Entity extends SqlBaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['create']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().create(
      data as CreateShape<SqlBaseEntity, Entity>,
      ...additionalArgs
    );
  }

  static update<Entity extends SqlBaseEntity>(
    this: Constructor<Entity>,
    ...args: Parameters<Entity['update']>
  ): Entity {
    const [data, ...additionalArgs] = args;
    return new this().update(
      data as UpdateShape<SqlBaseEntity, Entity>,
      ...additionalArgs
    );
  }

  static map<Entity extends SqlBaseEntity>(
    this: Constructor<Entity>,
    data: Partial<EntityDTO<FromEntityType<Entity>>>
  ): Entity {
    return new this().map(data);
  }

  create(data: CreateShape<SqlBaseEntity, this>): this {
    return Object.assign(this, transformRawDto(data, this));
  }

  update(data: UpdateShape<SqlBaseEntity, this>): this {
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
