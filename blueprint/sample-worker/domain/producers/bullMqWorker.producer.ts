import { Queue } from 'bullmq';
import { SampleWorkerEvent } from '../../persistence/entities';
import { SampleWorkerProducer } from '../interfaces/sampleWorkerProducer.interface';
import { BullMqWorkerOptions } from '../types/bullMqWorker.types';

export class BullMqWorkerProducer implements SampleWorkerProducer {
  private queue;

  constructor(
    private readonly queueName: string,
    private readonly options: BullMqWorkerOptions
  ) {
    this.queue = new Queue(this.queueName, {
      connection: this.options.connection
    });
  }

  async enqueueJob(event: SampleWorkerEvent): Promise<void> {
    await this.queue.add(event.id, event, {
      attempts: this.options.retries,
      backoff: {
        type: this.options.backoffType,
        delay: this.options.interval
      }
    });
  }
  async enqueueBatchJobs(events: SampleWorkerEvent[]): Promise<void> {
    await this.queue.addBulk(
      events.map((event) => ({
        name: event.id,
        data: event,
        opts: {
          attempts: this.options.retries,
          backoff: {
            type: this.options.backoffType,
            delay: this.options.interval
          }
        }
      }))
    );
  }
}
