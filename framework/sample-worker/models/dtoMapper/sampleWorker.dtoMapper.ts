import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  boolean,
  number,
  SchemaValidator,
  string
} from '@forklaunch/framework-core';
import { SampleWorkerRecord } from '../persistence/sampleWorkerRecord.entity';

// Exported type that matches the request schema
export type SampleWorkerRequestDto = SampleWorkerRequestDtoMapper['dto'];
// RequestDtoMapper class that maps the request schema to the entity
export class SampleWorkerRequestDtoMapper extends RequestDtoMapper<
  SampleWorkerRecord,
  SchemaValidator
> {
  // idiomatic validator schema defines the request schema
  schema = {
    message: string
  };

  // toEntity method maps the request schema to the entity
  toEntity(): SampleWorkerRecord {
    return SampleWorkerRecord.create({
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
  SampleWorkerRecord,
  SchemaValidator
> {
  // idiomatic validator schema defines the response schema
  schema = {
    message: string,
    processed: boolean,
    retryCount: number
  };

  // fromEntity method maps the entity to the response schema
  fromEntity(entity: SampleWorkerRecord): this {
    this.dto = entity.read();
    return this;
  }
}
