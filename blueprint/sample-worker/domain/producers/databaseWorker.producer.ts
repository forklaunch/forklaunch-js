import { EntityManager } from '@mikro-orm/core';
import { SampleWorkerEvent } from '../../persistence/entities';

export class DatabaseWorkerProducer {
  constructor(private readonly em: EntityManager) {}

  async enqueueJob(event: SampleWorkerEvent): Promise<void> {
    await this.em.persistAndFlush(event);
  }

  async enqueueBatchJobs(events: SampleWorkerEvent[]): Promise<void> {
    await this.em.persistAndFlush(events);
  }
}
