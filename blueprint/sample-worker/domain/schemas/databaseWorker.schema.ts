import { number } from '@forklaunch/blueprint-core';

export const DatabaseWorkerOptionsSchema = {
  retries: number,
  interval: number
};
