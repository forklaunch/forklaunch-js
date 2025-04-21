export interface WorkerProducer<T> {
  enqueueJob: (job: T) => Promise<void>;
  enqueueBatchJobs: (jobs: T[]) => Promise<void>;
}
