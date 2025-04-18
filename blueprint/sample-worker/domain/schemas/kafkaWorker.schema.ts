import { array, number, string } from '@forklaunch/blueprint-core';

export const KafkaWorkerOptionsSchema = {
  brokers: array(string),
  clientId: string,
  groupId: string,
  retries: number,
  interval: number,
  peekCount: number
};
