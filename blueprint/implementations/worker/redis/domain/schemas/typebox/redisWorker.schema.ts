import { number } from '@forklaunch/validator/typebox';

export const RedisWorkerOptionsSchema = {
  pageSize: number,
  retries: number,
  interval: number
};
