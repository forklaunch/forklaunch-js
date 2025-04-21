export type WorkerProcessFailureResult<T> = {
  value: T;
  error: Error;
};

export type WorkerProcessFunction<T> = (
  events: T[]
) => Promise<WorkerProcessFailureResult<T>[]>;

export type WorkerFailureHandler<T> = (
  results: WorkerProcessFailureResult<T>[]
) => Promise<void>;
