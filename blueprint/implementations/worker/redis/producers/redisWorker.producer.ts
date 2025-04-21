import { TtlCache } from '@forklaunch/core/cache';
import { WorkerProducer } from '@forklaunch/interfaces-worker/interfaces';
import { WorkerEventEntity } from '@forklaunch/interfaces-worker/types';

export class RedisWorkerProducer<EventEntity extends WorkerEventEntity>
  implements WorkerProducer<EventEntity>
{
  constructor(
    private readonly queueName: string,
    private readonly cache: TtlCache
  ) {}

  async enqueueJob(event: EventEntity): Promise<void> {
    await this.cache.enqueueRecord(this.queueName, event);
  }

  async enqueueBatchJobs(events: EventEntity[]): Promise<void> {
    console.log('Enqueuing batch jobs', events);
    await this.cache.enqueueBatchRecords(this.queueName, events);
  }
}
