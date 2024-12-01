import { TtlCache } from '@forklaunch/core/cache';
import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import { HelloForklaunchService } from '../interfaces/helloForklaunch.interface';
import {
  HelloForklaunchRequestDto,
  HelloForklaunchResponseDto,
  HelloForklaunchResponseDtoMapper
} from '../models/dtoMapper/helloForklaunch.dtoMapper';

export class BaseHelloForklaunchService implements HelloForklaunchService {
  constructor(
    private entityManager: EntityManager,
    private cache: TtlCache
  ) {}

  helloForklaunch = async (
    dto: HelloForklaunchRequestDto
  ): Promise<HelloForklaunchResponseDto> => {
    this.entityManager.persist(dto.toEntity());
    return HelloForklaunchResponseDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      dto
    );
  };
}
