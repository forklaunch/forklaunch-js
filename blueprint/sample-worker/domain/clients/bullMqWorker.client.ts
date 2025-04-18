import { Job, Queue, Worker } from 'bullmq';
import { SampleWorkerEvent } from '../../persistence/entities';
import {
  SampleWorkerClient,
  SampleWorkerFailureHandler,
  SampleWorkerProcessFunction
} from '../interfaces/sampleWorkerClient.interface';
import { BullMqWorkerOptions } from '../types/bullMqWorker.types';
export class BullMqWorkerClient implements SampleWorkerClient {
  private queue: Queue;
  private worker?: Worker;

  constructor(
    protected readonly queueName: string,
    protected readonly options: BullMqWorkerOptions,
    protected readonly processEvents: SampleWorkerProcessFunction,
    protected readonly failureHandler: SampleWorkerFailureHandler
  ) {
    this.queue = new Queue(this.queueName, {
      connection: this.options.connection
    });
  }

  async peekEvents(): Promise<SampleWorkerEvent[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active']);
    return jobs.map((job) => job.data as SampleWorkerEvent);
  }

  async start(): Promise<void> {
    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        console.log('starting worker');
        const event = job.data as SampleWorkerEvent;
        await this.processEvents([event]);
      },
      this.options
    );

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      if (job) {
        this.failureHandler([
          {
            value: job.data as SampleWorkerEvent,
            error
          }
        ]);
      }
    });
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
  }
}
