import { TtlCache } from '@forklaunch/core/cache';
import { EntityManager } from '@mikro-orm/core';
import { SchemaValidator } from '@{{app_name}}/core';
import { HelloForklaunchService } from '../interfaces/helloForklaunch.interface';
import {
  HelloForklaunchRequestDto,
  HelloForklaunchRequestDtoMapper,
  HelloForklaunchResponseDto,
  HelloForklaunchResponseDtoMapper
} from '../models/dtoMapper/helloForklaunch.dtoMapper';

// BaseHelloForklaunchService class that implements the HelloForklaunchService interface
export class BaseHelloForklaunchService implements HelloForklaunchService {
  constructor(private entityManager: EntityManager, private cache: TtlCache) {}

  // helloForklaunchPost method that implements the HelloForklaunchService interface
  helloForklaunchPost = async (
    dto: HelloForklaunchRequestDto
  ): Promise<HelloForklaunchResponseDto> => {
    const entity = HelloForklaunchRequestDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      dto
    );
    this.entityManager.persist(entity);
    return HelloForklaunchResponseDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      entity
    );
  };
}
