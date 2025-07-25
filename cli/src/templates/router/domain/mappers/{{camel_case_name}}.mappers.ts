import {
  RequestMapper,
  ResponseMapper
} from '@forklaunch/core/mappers';
import { SchemaValidator } from '@{{app_name}}/core';{{^is_worker}}
import { EntityManager } from '@mikro-orm/core';{{/is_worker}}
import { {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record} from '../../persistence/entities/{{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record.entity';
import { {{pascal_case_name}}RequestSchema, {{pascal_case_name}}ResponseSchema } from '../schemas/{{camel_case_name}}.schema';

// RequestMapper class that maps the request schema to the entity
export class {{pascal_case_name}}RequestMapper extends RequestMapper<
  {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record,
  SchemaValidator
> {
  // idiomatic validator schema defines the request schema
  schema = {{pascal_case_name}}RequestSchema;

  // toEntity method maps the request schema to the entity
  async toEntity({{^is_worker}}em: EntityManager{{/is_worker}}): Promise<{{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record> {
    return {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record.create({
      ...this.dto,{{#is_worker}}
      processed: false,
      retryCount: 0,{{/is_worker}}
      createdAt: new Date(),
      updatedAt: new Date(),
    }{{^is_worker}}, em{{/is_worker}});
  }
}

// ResponseMapper class that maps the response schema to the entity
export class {{pascal_case_name}}ResponseMapper extends ResponseMapper<
  {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record,
  SchemaValidator
> {
  // idiomatic validator schema defines the response schema
  schema = {{pascal_case_name}}ResponseSchema;

  // fromEntity method maps the entity to the response schema
  async fromEntity(entity: {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record): Promise<this> {
    this.dto = await entity.read();
    return this;
  }
}
