import { BaseEntity } from '@forklaunch/core/persistence';
import { PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

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
}
