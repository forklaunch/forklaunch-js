import { number } from '@forklaunch/validator/typebox';

export const DatabaseWorkerOptionsSchema = {
  retries: number,
  interval: number
};
