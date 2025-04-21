import { number } from '@forklaunch/validator/zod';

export const DatabaseWorkerOptionsSchema = {
  retries: number,
  interval: number
};
