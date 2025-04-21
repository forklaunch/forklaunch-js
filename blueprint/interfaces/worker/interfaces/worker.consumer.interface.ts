export interface WorkerConsumer<T> {
  peekEvents: () => Promise<T[]>;
  start: () => Promise<void>;
}
