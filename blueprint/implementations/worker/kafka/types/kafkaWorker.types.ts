export type WorkerOptions = {
  brokers: string[];
  clientId: string;
  groupId: string;
  retries: number;
  interval: number;
  peekCount: number;
};
