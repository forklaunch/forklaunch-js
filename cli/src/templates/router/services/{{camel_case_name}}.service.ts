import { TtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
{{^cache_backend}}import { EntityManager } from '@mikro-orm/core';{{/cache_backend}}
import { SchemaValidator } from '@{{app_name}}/core';
import { Metrics } from '@{{app_name}}/monitoring';
import { {{pascal_case_name}}Service } from '../interfaces/{{camel_case_name}}.interface';
import {
  {{pascal_case_name}}RequestDto,
  {{pascal_case_name}}RequestDtoMapper,
  {{pascal_case_name}}ResponseDto,
  {{pascal_case_name}}ResponseDtoMapper
} from '../models/dtoMapper/{{camel_case_name}}.dtoMapper';{{#cache_backend}}
import { CACHE_KEY_PREFIX } from '../consts';
{{/cache_backend}}

// Base{{pascal_case_name}}Service class that implements the {{pascal_case_name}}Service interface
export class Base{{pascal_case_name}}Service implements {{pascal_case_name}}Service {
  constructor({{^cache_backend}}private entityManager: EntityManager{{^is_worker}}, private cache: TtlCache{{/is_worker}}{{/cache_backend}}{{#cache_backend}}private cache: TtlCache{{/cache_backend}}, private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>) {}

  // {{camel_case_name}}Post method that implements the {{pascal_case_name}}Service interface
  {{camel_case_name}}Post = async (
    dto: {{pascal_case_name}}RequestDto
  ): Promise<{{pascal_case_name}}ResponseDto> => {
    const entity = {{pascal_case_name}}RequestDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      dto
    );{{^cache_backend}}
    this.entityManager.persistAndFlush(entity);{{/cache_backend}}{{#cache_backend}}
    this.cache.putRecord({
      key: `${CACHE_KEY_PREFIX}:${entity.id}`,
      value: entity,
      ttlMilliseconds: 60000
    });{{/cache_backend}}
    return {{pascal_case_name}}ResponseDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      entity
    );
  };
}
