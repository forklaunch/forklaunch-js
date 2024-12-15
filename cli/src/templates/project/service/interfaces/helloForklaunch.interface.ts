import {
  HelloForklaunchRequestDto,
  HelloForklaunchResponseDto
} from '../models/dtoMapper/helloForklaunch.dtoMapper';

export interface HelloForklaunchService {
  helloForklaunchPost: (
    dto: HelloForklaunchRequestDto
  ) => Promise<HelloForklaunchResponseDto>;
}