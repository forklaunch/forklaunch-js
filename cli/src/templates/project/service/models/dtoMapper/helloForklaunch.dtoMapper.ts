import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { SchemaValidator, string } from '@{{app_name}}/core';
import { HelloForklaunchRecord } from '../persistence/helloForklaunchRecord.entity';

// Exported type that matches the request schema
export type HelloForklaunchRequestDto = HelloForklaunchRequestDtoMapper['dto'];
// RequestDtoMapper class that maps the request schema to the entity
export class HelloForklaunchRequestDtoMapper extends RequestDtoMapper<
  HelloForklaunchRecord,
  SchemaValidator
> {
  // idiomatic validator schema defines the request schema
  schema = {
    message: string
  };

  // toEntity method maps the request schema to the entity
  toEntity(): HelloForklaunchRecord {
    return HelloForklaunchRecord.create(this.dto);
  }
}

// Exported type that matches the response schema
export type HelloForklaunchResponseDto =
  HelloForklaunchResponseDtoMapper['dto'];
// ResponseDtoMapper class that maps the response schema to the entity
export class HelloForklaunchResponseDtoMapper extends ResponseDtoMapper<
  HelloForklaunchRecord,
  SchemaValidator
> {
  // idiomatic validator schema defines the response schema
  schema = {
    message: string
  };

  // fromEntity method maps the entity to the response schema
  fromEntity(entity: HelloForklaunchRecord): this {
    this.dto = entity.read();
    return this;
  }
}
