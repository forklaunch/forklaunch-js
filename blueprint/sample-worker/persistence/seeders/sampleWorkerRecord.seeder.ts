import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, EntityManager, Property } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { sampleWorkerEventRecord } from '../seed.data';

// Entity class that defines the structure of the SampleWorkerEventRecord table
@Entity()
export class SampleWorkerEventRecord extends SqlBaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;

  @Property()
  processed!: boolean;

  @Property()
  retryCount!: number;
}

export class SampleWorkerEventRecordSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(SampleWorkerEventRecord, sampleWorkerEventRecord);
    return Promise.resolve();
  }
}
