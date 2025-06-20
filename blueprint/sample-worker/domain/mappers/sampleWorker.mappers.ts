import {
  boolean,
  number,
  SchemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { wrap } from '@mikro-orm/core';
import { SampleWorkerEventRecord } from '../../persistence/entities/sampleWorkerRecord.entity';
import { SampleWorkerSchema } from '../schemas/sampleWorker.schema';

// Exported type that matches the request schema
export type SampleWorkerRequestDto = SampleWorkerRequestMapper['dto'];
// RequestMapper class that maps the request schema to the entity
export class SampleWorkerRequestMapper extends RequestMapper<
  SampleWorkerEventRecord,
  SchemaValidator
> {
  // idiomatic validator schema defines the request schema
  schema = SampleWorkerSchema;

  // toEntity method maps the request schema to the entity
  async toEntity(): Promise<SampleWorkerEventRecord> {
    return SampleWorkerEventRecord.create({
      ...this.dto,
      processed: false,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

// Exported type that matches the response schema
export type SampleWorkerResponseDto = SampleWorkerResponseMapper['dto'];
// ResponseMapper class that maps the response schema to the entity
export class SampleWorkerResponseMapper extends ResponseMapper<
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
  async fromEntity(entity: SampleWorkerEventRecord): Promise<this> {
    if (!entity.isInitialized()) {
      throw new Error('SampleWorkerEventRecord is not initialized');
    }
    this.dto = wrap(entity).toPOJO();
    return this;
  }
}
