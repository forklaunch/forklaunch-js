import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, EntityManager, Property } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { sampleWorkerEvent } from '../seed.data';

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

export class SampleWorkerEventSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(SampleWorkerEvent, sampleWorkerEvent);
    return Promise.resolve();
  }
}
