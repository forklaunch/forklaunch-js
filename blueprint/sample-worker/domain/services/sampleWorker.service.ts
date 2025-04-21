import { SchemaValidator } from '@forklaunch/blueprint-core';
import { BullMqWorkerProducer } from '@forklaunch/implementation-worker-bullmq/producers';
import { DatabaseWorkerProducer } from '@forklaunch/implementation-worker-database/producers';
import { KafkaWorkerProducer } from '@forklaunch/implementation-worker-kafka/producers';
import { RedisWorkerProducer } from '@forklaunch/implementation-worker-redis/producers';
import { BullMqWorkerOptions } from '../../../implementations/worker/bullmq/lib/types/bullMqWorker.types';
import { KafkaWorkerOptions } from '../../../implementations/worker/kafka/lib/types/kafkaWorker.types';
import { SampleWorkerEvent } from '../../persistence/entities';
import { SampleWorkerService } from '../interfaces/sampleWorkerService.interface';
import {
  SampleWorkerRequestDto,
  SampleWorkerRequestDtoMapper,
  SampleWorkerResponseDto,
  SampleWorkerResponseDtoMapper
} from '../mappers/sampleWorker.mappers';

// BaseSampleWorkerService class that implements the SampleWorkerService interface
export class BaseSampleWorkerService implements SampleWorkerService {
  constructor(
    private databaseWorkerProducer: DatabaseWorkerProducer<SampleWorkerEvent>,
    private bullMqWorkerProducer: BullMqWorkerProducer<
      SampleWorkerEvent,
      BullMqWorkerOptions
    >,
    private redisWorkerProducer: RedisWorkerProducer<SampleWorkerEvent>,
    private kafkaWorkerProducer: KafkaWorkerProducer<
      SampleWorkerEvent,
      KafkaWorkerOptions
    >
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
