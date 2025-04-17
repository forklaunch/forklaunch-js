import { SampleWorkerEvent } from '../../persistence/entities';

export interface SampleWorkerProducer {
  enqueueJob: (job: SampleWorkerEvent) => Promise<void>;
  enqueueBatchJobs: (jobs: SampleWorkerEvent[]) => Promise<void>;
}
