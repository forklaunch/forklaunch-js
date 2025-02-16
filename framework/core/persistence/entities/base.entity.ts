import { stripUndefinedProperties } from '@forklaunch/common';
import {
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
    Object.assign(this, data);
    return this;
  }

  update(data: UpdateShape<BaseEntity, this>): this {
    wrap(this).assign(
      stripUndefinedProperties(data) as Partial<EntityDTO<FromEntityType<this>>>
    );
    return this;
  }

  read(): EntityDTO<this> {
    return wrap(this).toPOJO();
  }

  map(data: Partial<EntityDTO<FromEntityType<this>>>): this {
    wrap(this).assign(data);
    return this;
  }
}
