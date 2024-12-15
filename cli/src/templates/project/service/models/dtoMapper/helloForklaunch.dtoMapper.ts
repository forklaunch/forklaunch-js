import {
    RequestDtoMapper,
    ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { SchemaValidator, string } from '@{{app_name}}/core';
import { HelloForklaunchRecord } from '../persistence/helloForklaunchRecord.entity';

export type HelloForklaunchRequestDto = HelloForklaunchRequestDtoMapper['dto'];
export class HelloForklaunchRequestDtoMapper extends RequestDtoMapper<
  HelloForklaunchRecord,
  SchemaValidator
> {
  schema = {
    message: string
  };

  toEntity(): HelloForklaunchRecord {
    const entity = new HelloForklaunchRecord();
    entity.message = this.dto.message;
    return entity;
  }
}

export type HelloForklaunchResponseDto =
  HelloForklaunchResponseDtoMapper['dto'];
export class HelloForklaunchResponseDtoMapper extends ResponseDtoMapper<
  HelloForklaunchRecord,
  SchemaValidator
> {
  schema = {
    message: string
  };

  fromEntity(entity: HelloForklaunchRecord): this {
    this.dto = {
      message: entity.message
    };
    return this;
  }
}
