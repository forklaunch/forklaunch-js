import { SampleWorkerEvent } from '../../persistence/entities';

export interface SampleWorkerProcessFailureResult {
  value: SampleWorkerEvent;
  error: Error;
}

export interface SampleWorkerProcessFunction {
  (events: SampleWorkerEvent[]): Promise<SampleWorkerProcessFailureResult[]>;
}

export interface SampleWorkerFailureHandler {
  (results: SampleWorkerProcessFailureResult[]): Promise<void>;
}

// Interface that defines the methods that the SampleWorkerService must implement
export interface SampleWorkerClient {
  peekEvents: () => Promise<SampleWorkerEvent[]>;
  start: () => Promise<void>;
}
