import { number } from '@forklaunch/validator/zod';

export const RedisWorkerOptionsSchema = {
  pageSize: number,
  retries: number,
  interval: number
};
