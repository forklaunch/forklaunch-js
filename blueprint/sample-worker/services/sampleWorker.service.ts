import { TtlCache } from '@forklaunch/core/cache';
import { SchemaValidator } from '@forklaunch/blueprint-core';
import { EntityManager } from '@mikro-orm/core';
import { SAMPLE_WORKER_CACHE_KEY_PREFIX } from '../consts';
import { SampleWorkerService } from '../interfaces/sampleWorker.interface';
import {
  SampleWorkerRequestDto,
  SampleWorkerRequestDtoMapper,
  SampleWorkerResponseDto,
  SampleWorkerResponseDtoMapper
} from '../models/dtoMapper/sampleWorker.dtoMapper';

// BaseSampleWorkerService class that implements the SampleWorkerService interface
export class BaseSampleWorkerService implements SampleWorkerService {
  constructor(
    private entityManager: EntityManager,
    private cache: TtlCache
  ) {}

  // sampleWorkerPost method that implements the SampleWorkerService interface
  sampleWorkerPost = async (
    dto: SampleWorkerRequestDto
  ): Promise<SampleWorkerResponseDto> => {
    const entity = SampleWorkerRequestDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      dto
    );
    this.entityManager.persistAndFlush(entity);
    this.cache.putRecord({
      key: `${SAMPLE_WORKER_CACHE_KEY_PREFIX}:${entity.id}`,
      value: entity,
      ttlMilliseconds: 60000
    });
    return SampleWorkerResponseDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      entity
    );
  };
}
