import { OpenTelemetryCollector } from '@forklaunch/core/http';{{#is_worker}}
import { WorkerProducer } from '@forklaunch/interfaces-worker/interfaces';{{/is_worker}}{{^is_worker}}
import { EntityManager } from '@mikro-orm/core';{{/is_worker}}
import { SchemaValidator } from '@{{app_name}}/core';
import { Metrics } from '@{{app_name}}/monitoring';
import { {{pascal_case_name}}Service } from '../domain/interfaces/{{camel_case_name}}.interface';
import { 
  {{pascal_case_name}}RequestDto, 
  {{pascal_case_name}}ResponseDto 
} from '../domain/types/{{camel_case_name}}.types';
import {
  {{pascal_case_name}}RequestDtoMapper,
  {{pascal_case_name}}ResponseDtoMapper
} from '../domain/mappers/{{camel_case_name}}.mappers';{{#is_worker}}
import { {{pascal_case_name}}EventRecord } from '../persistence/entities';{{/is_worker}}

// Base{{pascal_case_name}}Service class that implements the {{pascal_case_name}}Service interface
export class Base{{pascal_case_name}}Service implements {{pascal_case_name}}Service {
  constructor({{^is_worker}}
    private entityManager: EntityManager{{/is_worker}}{{#is_worker}}
    private workerProducer: WorkerProducer<{{pascal_case_name}}EventRecord>{{/is_worker}}, 
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  // {{camel_case_name}}Post method that implements the {{pascal_case_name}}Service interface
  {{camel_case_name}}Post = async (
    dto: {{pascal_case_name}}RequestDto
  ): Promise<{{pascal_case_name}}ResponseDto> => {
    const entity = {{pascal_case_name}}RequestDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      dto
    );
    {{#is_worker}}
    await this.workerProducer.enqueueJob(entity);{{/is_worker}}{{^is_worker}}
    this.entityManager.persistAndFlush(entity);
    {{/is_worker}}
    return {{pascal_case_name}}ResponseDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      entity
    );
  };
}
