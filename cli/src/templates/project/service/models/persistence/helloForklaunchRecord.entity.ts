import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@{{app_name}}/core';

// Entity class that defines the structure of the HelloForklaunchRecord table
@Entity()
export class HelloForklaunchRecord extends BaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;
}
