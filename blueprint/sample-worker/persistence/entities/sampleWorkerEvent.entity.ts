import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Property } from '@mikro-orm/core';

// Entity class that defines the structure of the SampleWorkerEvent table
@Entity()
export class SampleWorkerEvent extends SqlBaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;

  @Property()
  processed!: boolean;

  @Property()
  retryCount!: number;
}
