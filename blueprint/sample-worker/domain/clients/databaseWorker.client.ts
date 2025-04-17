import { EntityManager } from '@mikro-orm/core';
import { SampleWorkerEvent } from '../../persistence/entities';
import {
  SampleWorkerClient,
  SampleWorkerFailureHandler,
  SampleWorkerProcessFunction
} from '../interfaces/sampleWorkerClient.interface';
import { DatabaseWorkerOptions } from '../types/databaseWorker.types';

export class DatabaseWorkerClient implements SampleWorkerClient {
  constructor(
    protected readonly em: EntityManager,
    protected readonly options: DatabaseWorkerOptions,
    protected readonly processEvents: SampleWorkerProcessFunction,
    protected readonly failureHandler: SampleWorkerFailureHandler
  ) {}

  private async retrieveEvents(): Promise<SampleWorkerEvent[]> {
    return await this.em.getRepository(SampleWorkerEvent).findAll({
      where: {
        processed: false,
        retryCount: {
          $lt: this.options.retries
        }
      },
      orderBy: {
        createdAt: 'ASC'
      }
    });
  }

  private async updateEvents(events: SampleWorkerEvent[]): Promise<void> {
    await this.em.getRepository(SampleWorkerEvent).upsertMany(
      events.map((event) => ({
        ...event,
        retryCount: event.retryCount + 1
      }))
    );
  }

  async peekEvents(): Promise<SampleWorkerEvent[]> {
    return await this.retrieveEvents();
  }

  async start(): Promise<void> {
    setInterval(async () => {
      const events = await this.retrieveEvents();
      const failedEvents = await this.processEvents(events);
      await this.failureHandler(failedEvents);
      await this.updateEvents(failedEvents.map((event) => event.value));
      await this.em.flush();
    }, this.options.interval);
  }
}
