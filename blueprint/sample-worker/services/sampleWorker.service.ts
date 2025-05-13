import { SchemaValidator } from '@forklaunch/blueprint-core';
import { BullMqWorkerProducer } from '@forklaunch/implementation-worker-bullmq/producers';
import { BullMqWorkerOptions } from '@forklaunch/implementation-worker-bullmq/types';
import { DatabaseWorkerProducer } from '@forklaunch/implementation-worker-database/producers';
import { DatabaseWorkerOptions } from '@forklaunch/implementation-worker-database/types';
import { KafkaWorkerProducer } from '@forklaunch/implementation-worker-kafka/producers';
import { RedisWorkerProducer } from '@forklaunch/implementation-worker-redis/producers';
import { RedisWorkerOptions } from '@forklaunch/implementation-worker-redis/types';
import { KafkaWorkerOptions } from '../../implementations/worker/kafka/lib/types/kafkaWorker.types';
import { SampleWorkerService } from '../domain/interfaces/sampleWorkerService.interface';
import {
  SampleWorkerRequestDto,
  SampleWorkerRequestDtoMapper,
  SampleWorkerResponseDto,
  SampleWorkerResponseDtoMapper
} from '../domain/mappers/sampleWorker.mappers';
import { SampleWorkerEventRecord } from '../persistence/entities';

// BaseSampleWorkerService class that implements the SampleWorkerService interface
export class BaseSampleWorkerService implements SampleWorkerService {
  constructor(
    private databaseWorkerProducer: DatabaseWorkerProducer<
      SampleWorkerEventRecord,
      DatabaseWorkerOptions
    >,
    private bullMqWorkerProducer: BullMqWorkerProducer<
      SampleWorkerEventRecord,
      BullMqWorkerOptions
    >,
    private redisWorkerProducer: RedisWorkerProducer<
      SampleWorkerEventRecord,
      RedisWorkerOptions
    >,
    private kafkaWorkerProducer: KafkaWorkerProducer<
      SampleWorkerEventRecord,
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
