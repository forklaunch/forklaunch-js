import { OpenTelemetryCollector } from '@forklaunch/core/http';{{#is_worker}}
import { WorkerProducer } from '@forklaunch/interfaces-worker/interfaces';{{/is_worker}}{{^is_worker}}
import { EntityManager } from '@mikro-orm/core';{{/is_worker}}
import { SchemaValidator } from '@{{app_name}}/core';
import { Metrics } from '@{{app_name}}/monitoring';
import { {{pascal_case_name}}Service } from '../interfaces/{{camel_case_name}}.interface';
import {
  {{pascal_case_name}}RequestDto,
  {{pascal_case_name}}ResponseDto
} from '../types/{{camel_case_name}}.types';
import {
  {{pascal_case_name}}RequestMapper,
  {{pascal_case_name}}ResponseMapper
} from '../mappers/{{camel_case_name}}.mappers';{{#is_worker}}
import { {{pascal_case_name}}EventRecord } from '../../persistence/entities';{{/is_worker}}

// Base{{pascal_case_name}}Service class that implements the {{pascal_case_name}}Service interface
export class Base{{pascal_case_name}}Service implements {{pascal_case_name}}Service { {{^is_worker}}
  private entityManager: EntityManager;{{/is_worker}}{{#is_worker}}
  private workerProducer: WorkerProducer<{{pascal_case_name}}EventRecord>;{{/is_worker}}
  private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>;

  constructor({{^is_worker}}
    entityManager: EntityManager,{{/is_worker}}{{#is_worker}}
    workerProducer: WorkerProducer<{{pascal_case_name}}EventRecord>,{{/is_worker}} 
    openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) { {{^is_worker}}
    this.entityManager = entityManager;{{/is_worker}}{{#is_worker}}
    this.workerProducer = workerProducer;{{/is_worker}}
    this.openTelemetryCollector = openTelemetryCollector;
  }

  // {{camel_case_name}}Post method that implements the {{pascal_case_name}}Service interface
  {{camel_case_name}}Post = async (
    dto: {{pascal_case_name}}RequestDto
  ): Promise<{{pascal_case_name}}ResponseDto> => {
    const entity = await {{pascal_case_name}}RequestMapper.toEntity(
      dto{{^is_worker}},
      this.entityManager{{/is_worker}}
    );
    {{#is_worker}}
    await this.workerProducer.enqueueJob(entity);{{/is_worker}}{{^is_worker}}
    await this.entityManager.persistAndFlush(entity);
    {{/is_worker}}
    return {{pascal_case_name}}ResponseMapper.toDto(entity);
  };
}
