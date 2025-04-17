import { TtlCache } from '@forklaunch/core/cache';
import { SampleWorkerEvent } from '../../persistence/entities';
import { SampleWorkerProducer } from '../interfaces/sampleWorkerProducer.interface';

export class RedisWorkerProducer implements SampleWorkerProducer {
  constructor(
    private readonly queueName: string,
    private readonly cache: TtlCache
  ) {}

  async enqueueJob(event: SampleWorkerEvent): Promise<void> {
    await this.cache.enqueueRecord(this.queueName, event);
  }

  async enqueueBatchJobs(events: SampleWorkerEvent[]): Promise<void> {
    await this.cache.enqueueBatchRecords(this.queueName, events);
  }
}
