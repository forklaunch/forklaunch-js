import { OpenTelemetryCollector } from '@forklaunch/core/http';{{#is_worker}}
import { WorkerProducer } from '@forklaunch/interfaces-worker/interfaces';{{/is_worker}}{{^is_worker}}
import { EntityManager } from '@mikro-orm/core';{{/is_worker}}
import { SchemaValidator, Schema } from '@{{app_name}}/core';
import { Metrics } from '@{{app_name}}/monitoring';
import { {{pascal_case_name}}Service } from '../interfaces/{{camel_case_name}}.interface';{{#with_mappers}}
import {
  {{pascal_case_name}}RequestDto,
  {{pascal_case_name}}ResponseDto
} from '../types/{{camel_case_name}}.types';
import {
  {{pascal_case_name}}RequestMapper,
  {{pascal_case_name}}ResponseMapper
} from '../mappers/{{camel_case_name}}.mappers';{{/with_mappers}}{{^with_mappers}}
import {
  {{pascal_case_name}}RequestSchema,
  {{pascal_case_name}}ResponseSchema
} from '../schemas/{{camel_case_name}}.schema';

// When not using mappers, work directly with schema-validated types
type {{pascal_case_name}}Request = Schema<typeof {{pascal_case_name}}RequestSchema, SchemaValidator>;
type {{pascal_case_name}}Response = Schema<typeof {{pascal_case_name}}ResponseSchema, SchemaValidator>;{{/with_mappers}}{{#is_worker}}
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
  {{camel_case_name}}Post = async ({{#with_mappers}}
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
    return {{pascal_case_name}}ResponseMapper.toDto(entity);{{/with_mappers}}{{^with_mappers}}
    data: {{pascal_case_name}}Request
  ): Promise<{{pascal_case_name}}Response> => {
    // TODO: Implement {{camel_case_name}}Post logic
    // This service was generated without mappers.
    // Implement your business logic here working directly with the schema-validated data.
    throw new Error('Not implemented: {{camel_case_name}}Post');{{/with_mappers}}
  };
}
