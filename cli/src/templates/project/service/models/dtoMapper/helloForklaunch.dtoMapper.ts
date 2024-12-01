import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { SchemaValidator, string } from '@forklaunch/framework-core';
import { HelloForklaunchRecord } from '../persistence/helloForklaunchRecord.entity';

export type HelloForklaunchRequestDto = HelloForklaunchRequestDtoMapper['dto'];
export class HelloForklaunchRequestDtoMapper extends RequestDtoMapper<
  HelloForklaunchRecord,
  SchemaValidator
> {
  schema = {
    name: string
  };

  toEntity(): HelloForklaunchRecord {
    const entity = new HelloForklaunchRecord();
    entity.name = this.dto.name;
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
    name: string
  };

  fromEntity(entity: HelloForklaunchRecord): this {
    this.dto = {
      name: entity.name
    };
    return this;
  }
}
