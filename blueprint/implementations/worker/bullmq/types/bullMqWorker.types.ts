import { QueueOptions } from 'bullmq';

export type WorkerOptions = QueueOptions & {
  backoffType: 'exponential' | 'fixed';
  retries: number;
  interval: number;
};
