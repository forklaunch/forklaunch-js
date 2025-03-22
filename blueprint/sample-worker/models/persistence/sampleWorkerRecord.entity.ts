import { BaseEntity } from '@forklaunch/framework-core';
import { Entity, Property } from '@mikro-orm/core';

// Entity class that defines the structure of the SampleWorkerRecord table
@Entity()
export class SampleWorkerRecord extends BaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;

  @Property()
  processed!: boolean;

  @Property()
  retryCount!: number;
}
