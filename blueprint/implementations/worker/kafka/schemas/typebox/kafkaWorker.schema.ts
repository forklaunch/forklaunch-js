import { array, number, string } from '@forklaunch/validator/typebox';

export const KafkaWorkerOptionsSchema = {
  brokers: array(string),
  clientId: string,
  groupId: string,
  retries: number,
  interval: number,
  peekCount: number
};
