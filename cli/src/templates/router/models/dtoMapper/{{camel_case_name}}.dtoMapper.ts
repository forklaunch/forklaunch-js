import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { SchemaValidator, string } from '@{{app_name}}/core';
import { {{pascal_case_name}}Record } from '../persistence/{{camel_case_name}}Record.entity';

// Exported type that matches the request schema
export type {{pascal_case_name}}RequestDto = {{pascal_case_name}}RequestDtoMapper['dto'];
// RequestDtoMapper class that maps the request schema to the entity
export class {{pascal_case_name}}RequestDtoMapper extends RequestDtoMapper<
  {{pascal_case_name}}Record,
  SchemaValidator
> {
  // idiomatic validator schema defines the request schema
  schema = {
    message: string
  };

  // toEntity method maps the request schema to the entity
  toEntity(): {{pascal_case_name}}Record {
    return {{pascal_case_name}}Record.create(this.dto);
  }
}

// Exported type that matches the response schema
export type {{pascal_case_name}}ResponseDto =
  {{pascal_case_name}}ResponseDtoMapper['dto'];
// ResponseDtoMapper class that maps the response schema to the entity
export class {{pascal_case_name}}ResponseDtoMapper extends ResponseDtoMapper<
  {{pascal_case_name}}Record,
  SchemaValidator
> {
  // idiomatic validator schema defines the response schema
  schema = {
    message: string
  };

  // fromEntity method maps the entity to the response schema
  fromEntity(entity: {{pascal_case_name}}Record): this {
    this.dto = entity.read();
    return this;
  }
}
