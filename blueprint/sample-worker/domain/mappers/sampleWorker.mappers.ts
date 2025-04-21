import {
  boolean,
  number,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { SampleWorkerEventRecord } from '../../persistence/entities/sampleWorkerRecord.entity';
import { SampleWorkerSchema } from '../schemas/sampleWorker.schema';

// Exported type that matches the request schema
export type SampleWorkerRequestDto = SampleWorkerRequestDtoMapper['dto'];
// RequestDtoMapper class that maps the request schema to the entity
export class SampleWorkerRequestDtoMapper extends RequestDtoMapper<
  SampleWorkerEventRecord,
  SchemaValidator
> {
  // idiomatic validator schema defines the request schema
  schema = SampleWorkerSchema;

  // toEntity method maps the request schema to the entity
  toEntity(): SampleWorkerEventRecord {
    return SampleWorkerEventRecord.create({
      ...this.dto,
      processed: false,
      retryCount: 0
    });
  }
}

// Exported type that matches the response schema
export type SampleWorkerResponseDto = SampleWorkerResponseDtoMapper['dto'];
// ResponseDtoMapper class that maps the response schema to the entity
export class SampleWorkerResponseDtoMapper extends ResponseDtoMapper<
  SampleWorkerEventRecord,
  SchemaValidator
> {
  // idiomatic validator schema defines the response schema
  schema = {
    message: string,
    processed: boolean,
    retryCount: number
  };

  // fromEntity method maps the entity to the response schema
  fromEntity(entity: SampleWorkerEventRecord): this {
    this.dto = entity.read();
    return this;
  }
}
