import { BaseEntity } from '@forklaunch/core/persistence';
import { WorkerEventEntity } from '@forklaunch/interfaces-worker/types';
import { EntityManager } from '@mikro-orm/core';
import { WorkerOptions } from '../types/databaseWorker.types';
export class DatabaseWorkerProducer<
  EventEntity extends WorkerEventEntity & BaseEntity,
  Options extends WorkerOptions
> {
  constructor(
    private readonly em: EntityManager,
    private readonly options: Options
  ) {}

  async enqueueJob(event: EventEntity): Promise<void> {
    await this.em.persistAndFlush(event);
  }

  async enqueueBatchJobs(events: EventEntity[]): Promise<void> {
    await this.em.persistAndFlush(events);
  }
}
