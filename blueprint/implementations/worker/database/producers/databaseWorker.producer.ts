import { WorkerEventEntity } from '@forklaunch/interfaces-worker/types';
import { BaseEntity, EntityManager } from '@mikro-orm/core';
import { DatabaseWorkerOptions } from '../domain/types/databaseWorker.types';

export class DatabaseWorkerProducer<
  EventEntity extends WorkerEventEntity & BaseEntity,
  Options extends DatabaseWorkerOptions
> {
  private readonly em: EntityManager;
  private readonly options: Options;

  constructor(em: EntityManager, options: Options) {
    this.em = em;
    this.options = options;
  }

  async enqueueJob(event: EventEntity): Promise<void> {
    await this.em.persistAndFlush(event);
  }

  async enqueueBatchJobs(events: EventEntity[]): Promise<void> {
    await this.em.persistAndFlush(events);
  }
}
