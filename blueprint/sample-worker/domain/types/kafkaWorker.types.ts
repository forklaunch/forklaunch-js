export type KafkaWorkerOptions = {
  brokers: string[];
  clientId: string;
  groupId: string;
  retries: number;
  interval: number;
};
