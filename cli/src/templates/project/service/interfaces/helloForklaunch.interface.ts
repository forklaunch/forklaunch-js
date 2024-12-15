import {
  HelloForklaunchRequestDto,
  HelloForklaunchResponseDto
} from '../models/dtoMapper/helloForklaunch.dtoMapper';

// Interface that defines the methods that the HelloForklaunchService must implement
export interface HelloForklaunchService {
  helloForklaunchPost: (
    dto: HelloForklaunchRequestDto
  ) => Promise<HelloForklaunchResponseDto>;
}