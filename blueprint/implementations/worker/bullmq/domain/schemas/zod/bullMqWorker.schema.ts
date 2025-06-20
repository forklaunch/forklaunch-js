import { literal, number, type, union } from '@forklaunch/validator/zod';
import { QueueOptions } from 'bullmq';

export const BullMqWorkerOptionsSchema = {
  queueOptions: type<QueueOptions>(),
  backoffType: union([literal('exponential'), literal('fixed')]),
  retries: number,
  interval: number
};
