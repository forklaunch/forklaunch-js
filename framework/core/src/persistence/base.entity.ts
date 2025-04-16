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

type BaseEntityWithId = BaseEntity & {
  id?: unknown;
  _id?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export abstract class BaseEntity extends MikroOrmBaseEntity {
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

  static map<Entity extends BaseEntity>(
    this: Constructor<Entity>,
    data: Partial<EntityDTO<FromEntityType<Entity>>>
  ): Entity {
    return new this().map(data);
  }

  create(data: CreateShape<BaseEntityWithId, this>): this {
    return Object.assign(this, transformRawDto(data, this));
  }

  update(data: UpdateShape<BaseEntityWithId, this>): this {
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
