import { WorkerConsumer } from '@forklaunch/interfaces-worker/interfaces';
import {
  WorkerEventEntity,
  WorkerFailureHandler,
  WorkerProcessFunction
} from '@forklaunch/interfaces-worker/types';
import { Job, Queue, Worker } from 'bullmq';
import { BullMqWorkerOptions } from '../types/bullMqWorker.types';

export class BullMqWorkerConsumer<
  EventEntity extends WorkerEventEntity,
  Options extends BullMqWorkerOptions
> implements WorkerConsumer<EventEntity>
{
  private queue: Queue;
  private worker?: Worker;

  constructor(
    protected readonly queueName: string,
    protected readonly options: Options,
    protected readonly processEvents: WorkerProcessFunction<EventEntity>,
    protected readonly failureHandler: WorkerFailureHandler<EventEntity>
  ) {
    this.queue = new Queue(this.queueName, {
      connection: this.options.queueOptions.connection
    });
  }

  async peekEvents(): Promise<EventEntity[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active']);
    return jobs.map((job) => job.data as EventEntity);
  }

  async start(): Promise<void> {
    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        const event = job.data as EventEntity;
        await this.processEvents([event]);
      },
      this.options.queueOptions
    );

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      if (job) {
        this.failureHandler([
          {
            value: job.data as EventEntity,
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
