import { {{#is_mongo}}Mongo{{/is_mongo}}BaseEntity } from '@forklaunch/core/database';
import { Entity, Property } from '@mikro-orm/core';

// Entity class that defines the structure of the HelloForklaunchRecord table
@Entity()
export class HelloForklaunchRecord extends {{#is_mongo}}Mongo{{/is_mongo}}BaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;
}
