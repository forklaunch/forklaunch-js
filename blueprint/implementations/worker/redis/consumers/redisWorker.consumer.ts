import { TtlCache } from '@forklaunch/core/cache';
import { WorkerConsumer } from '@forklaunch/interfaces-worker/interfaces';
import {
  WorkerEventEntity,
  WorkerFailureHandler,
  WorkerProcessFunction
} from '@forklaunch/interfaces-worker/types';
import { WorkerOptions } from '../types/redisWorker.types';

export class RedisWorkerConsumer<
  EventEntity extends WorkerEventEntity,
  Options extends WorkerOptions
> implements WorkerConsumer<EventEntity>
{
  constructor(
    protected readonly queueName: string,
    protected readonly cache: TtlCache,
    protected readonly options: Options,
    protected readonly processEvents: WorkerProcessFunction<EventEntity>,
    protected readonly failureHandler: WorkerFailureHandler<EventEntity>
  ) {}

  private async retrieveEvents(): Promise<EventEntity[]> {
    const events = (
      await this.cache.dequeueBatchRecords<EventEntity>(
        this.queueName,
        this.options.pageSize
      )
    ).filter((event) => event != null);
    return events;
  }

  private async updateEvents(events: EventEntity[]): Promise<void> {
    await this.cache.enqueueBatchRecords(
      this.queueName,
      events
        .filter((event) => event != null && event.retryCount <= 3)
        .map((event) => ({
          ...event,
          retryCount: event.retryCount + 1
        }))
    );
  }

  async peekEvents(): Promise<EventEntity[]> {
    const events = await this.cache.peekQueueRecords<EventEntity>(
      this.queueName,
      this.options.pageSize
    );
    return events;
  }

  async start(): Promise<void> {
    setInterval(async () => {
      const events = await this.retrieveEvents();
      const failedEvents = await this.processEvents(events);
      await this.failureHandler(failedEvents);
      await this.updateEvents(failedEvents.map((event) => event.value));
    }, this.options.interval);
  }
}
