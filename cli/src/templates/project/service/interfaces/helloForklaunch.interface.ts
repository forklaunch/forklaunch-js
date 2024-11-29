import {
  HelloForklaunchRequestDto,
  HelloForklaunchResponseDto
} from '../models/dtoMapper/helloForklaunch.dtoMapper';

export interface HelloForklaunchService {
  helloForklaunch: (
    dto: HelloForklaunchRequestDto
  ) => Promise<HelloForklaunchResponseDto>;
}
