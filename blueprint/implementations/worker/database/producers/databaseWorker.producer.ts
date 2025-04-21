import { BaseEntity } from '@forklaunch/core/persistence';
import { WorkerEventEntity } from '@forklaunch/interfaces-worker/types';
import { EntityManager } from '@mikro-orm/core';

export class DatabaseWorkerProducer<
  EventEntity extends WorkerEventEntity & BaseEntity
> {
  constructor(private readonly em: EntityManager) {}

  async enqueueJob(event: EventEntity): Promise<void> {
    await this.em.persistAndFlush(event);
  }

  async enqueueBatchJobs(events: EventEntity[]): Promise<void> {
    await this.em.persistAndFlush(events);
  }
}
