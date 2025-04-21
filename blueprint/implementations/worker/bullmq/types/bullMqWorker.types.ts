import { QueueOptions } from 'bullmq';

export type BullMqWorkerOptions = QueueOptions & {
  backoffType: 'exponential' | 'fixed';
  retries: number;
  interval: number;
};
