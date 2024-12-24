import { PrimaryKey, Property, SerializedPrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

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
  @PrimaryKey({ type: 'uuid' })
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
}
