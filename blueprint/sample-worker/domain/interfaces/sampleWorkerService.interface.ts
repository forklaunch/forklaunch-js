import {
  SampleWorkerRequestDto,
  SampleWorkerResponseDto
} from '../mappers/sampleWorker.mappers';

// Interface that defines the methods that the SampleWorkerService must implement
export interface SampleWorkerService {
  sampleWorkerPost: (
    dto: SampleWorkerRequestDto
  ) => Promise<SampleWorkerResponseDto>;
}
