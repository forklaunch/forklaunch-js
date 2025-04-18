import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, EntityManager, Property } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { sampleWorkerRecord } from '../seed.data';

// Entity class that defines the structure of the SampleWorkerRecord table
@Entity()
export class SampleWorkerRecord extends SqlBaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;

  @Property()
  processed!: boolean;

  @Property()
  retryCount!: number;
}

export class SampleWorkerRecordSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(SampleWorkerRecord, sampleWorkerRecord);
    return Promise.resolve();
  }
}
