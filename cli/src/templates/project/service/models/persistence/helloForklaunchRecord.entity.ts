import { BaseEntity } from '@forklaunch/core/database';
import { Entity, Property } from '@mikro-orm/core';

// Entity class that defines the structure of the HelloForklaunchRecord table
@Entity()
export class HelloForklaunchRecord extends BaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;
}
