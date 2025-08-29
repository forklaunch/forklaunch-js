import {
  boolean,
  number,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { wrap } from '@mikro-orm/core';
import { SampleWorkerEventRecord } from '../../persistence/entities/sampleWorkerRecord.entity';
import { SampleWorkerSchema } from '../schemas/sampleWorker.schema';

// RequestMapper function that maps the request schema to the entity
export const SampleWorkerRequestMapper = requestMapper(
  schemaValidator,
  SampleWorkerSchema,
  SampleWorkerEventRecord,
  {
    toEntity: async (dto) => {
      return SampleWorkerEventRecord.create({
        ...dto,
        processed: false,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
);

// ResponseMapper function that maps the response schema to the entity
export const SampleWorkerResponseMapper = responseMapper(
  schemaValidator,
  {
    message: string,
    processed: boolean,
    retryCount: number
  },
  SampleWorkerEventRecord,
  {
    toDto: async (entity: SampleWorkerEventRecord) => {
      if (!entity.isInitialized()) {
        throw new Error('SampleWorkerEventRecord is not initialized');
      }
      return wrap(entity).toPOJO();
    }
  }
);

// Exported types for backward compatibility
export type SampleWorkerRequestDto = Parameters<
  typeof SampleWorkerRequestMapper.toEntity
>[0];
export type SampleWorkerResponseDto = Awaited<
  ReturnType<typeof SampleWorkerResponseMapper.toDto>
>;
