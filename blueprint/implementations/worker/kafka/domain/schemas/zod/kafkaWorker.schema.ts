import { array, number, string } from '@forklaunch/validator/zod';

export const KafkaWorkerOptionsSchema = {
  brokers: array(string),
  clientId: string,
  groupId: string,
  retries: number,
  interval: number,
  peekCount: number
};
