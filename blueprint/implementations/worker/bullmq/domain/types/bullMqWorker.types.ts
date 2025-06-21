import { QueueOptions } from 'bullmq';

export type BullMqWorkerOptions = {
  queueOptions: QueueOptions;
  backoffType: 'exponential' | 'fixed';
  retries: number;
  interval: number;
};
