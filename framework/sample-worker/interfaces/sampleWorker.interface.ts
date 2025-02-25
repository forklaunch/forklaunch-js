import {
  SampleWorkerRequestDto,
  SampleWorkerResponseDto
} from '../models/dtoMapper/sampleWorker.dtoMapper';

// Interface that defines the methods that the SampleWorkerService must implement
export interface SampleWorkerService {
  sampleWorkerPost: (
    dto: SampleWorkerRequestDto
  ) => Promise<SampleWorkerResponseDto>;
}
