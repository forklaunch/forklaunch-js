import { TtlCache } from '@forklaunch/core/cache';
import { SampleWorkerEvent } from '../../persistence/entities';
import {
  SampleWorkerClient,
  SampleWorkerFailureHandler,
  SampleWorkerProcessFunction
} from '../interfaces/sampleWorkerClient.interface';
import { RedisWorkerOptions } from '../types/redisWorker.types';

export class RedisWorkerClient implements SampleWorkerClient {
  constructor(
    protected readonly queueName: string,
    protected readonly cache: TtlCache,
    protected readonly options: RedisWorkerOptions,
    protected readonly processEvents: SampleWorkerProcessFunction,
    protected readonly failureHandler: SampleWorkerFailureHandler
  ) {}

  private async retrieveEvents(): Promise<SampleWorkerEvent[]> {
    const events = (
      await this.cache.dequeueBatchRecords<SampleWorkerEvent>(
        this.queueName,
        this.options.pageSize
      )
    ).filter((event) => event != null);
    return events;
  }

  private async updateEvents(events: SampleWorkerEvent[]): Promise<void> {
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

  async peekEvents(): Promise<SampleWorkerEvent[]> {
    const events = await this.cache.peekQueueRecords<SampleWorkerEvent>(
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
