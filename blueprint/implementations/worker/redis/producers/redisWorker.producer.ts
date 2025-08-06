import { TtlCache } from '@forklaunch/core/cache';
import { WorkerProducer } from '@forklaunch/interfaces-worker/interfaces';
import { WorkerEventEntity } from '@forklaunch/interfaces-worker/types';
import { RedisWorkerOptions } from '../domain/types/redisWorker.types';

export class RedisWorkerProducer<
  EventEntity extends WorkerEventEntity,
  Options extends RedisWorkerOptions
> implements WorkerProducer<EventEntity>
{
  private readonly queueName: string;
  private readonly cache: TtlCache;
  private readonly options: Options;

  constructor(queueName: string, cache: TtlCache, options: Options) {
    this.queueName = queueName;
    this.cache = cache;
    this.options = options;
  }

  async enqueueJob(event: EventEntity): Promise<void> {
    await this.cache.enqueueRecord(this.queueName, event);
  }

  async enqueueBatchJobs(events: EventEntity[]): Promise<void> {
    await this.cache.enqueueBatchRecords(this.queueName, events);
  }
}
