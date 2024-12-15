import { BaseEntity } from '@forklaunch/core/database';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class HelloForklaunchRecord extends BaseEntity {
  @Property()
  message!: string;
}
