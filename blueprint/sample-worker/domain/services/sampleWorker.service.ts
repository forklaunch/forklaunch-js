import { SchemaValidator } from '@forklaunch/blueprint-core';
import { SampleWorkerService } from '../interfaces/sampleWorkerService.interface';
import {
  SampleWorkerRequestDto,
  SampleWorkerRequestDtoMapper,
  SampleWorkerResponseDto,
  SampleWorkerResponseDtoMapper
} from '../mappers/sampleWorker.mappers';
import { BullMqWorkerProducer } from '../producers/bullMqWorker.producer';
import { DatabaseWorkerProducer } from '../producers/databaseWorker.producer';
import { KafkaWorkerProducer } from '../producers/kafkaWorker.producer';
import { RedisWorkerProducer } from '../producers/redisWorker.producer';

// BaseSampleWorkerService class that implements the SampleWorkerService interface
export class BaseSampleWorkerService implements SampleWorkerService {
  constructor(
    private databaseWorkerProducer: DatabaseWorkerProducer,
    private bullMqWorkerProducer: BullMqWorkerProducer,
    private redisWorkerProducer: RedisWorkerProducer,
    private kafkaWorkerProducer: KafkaWorkerProducer
  ) {}

  // sampleWorkerPost method that implements the SampleWorkerService interface
  sampleWorkerPost = async (
    dto: SampleWorkerRequestDto
  ): Promise<SampleWorkerResponseDto> => {
    const entity = SampleWorkerRequestDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      dto
    );

    await this.databaseWorkerProducer.enqueueJob(entity);
    await this.bullMqWorkerProducer.enqueueJob(entity);
    await this.redisWorkerProducer.enqueueJob(entity);
    await this.kafkaWorkerProducer.enqueueJob(entity);

    return SampleWorkerResponseDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      entity
    );
  };
}
