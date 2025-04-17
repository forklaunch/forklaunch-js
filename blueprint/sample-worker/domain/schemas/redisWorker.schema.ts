import { number } from '@forklaunch/blueprint-core';

export const RedisWorkerOptionsSchema = {
  pageSize: number,
  retries: number,
  interval: number
};
