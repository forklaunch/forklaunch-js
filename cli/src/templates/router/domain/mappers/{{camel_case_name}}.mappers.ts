import {
  requestMapper,
  responseMapper
} from '@forklaunch/core/mappers';
import { schemaValidator } from '@{{app_name}}/core';{{^is_worker}}
import { EntityManager } from '@mikro-orm/core';{{/is_worker}}
import { {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record} from '../../persistence/entities/{{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record.entity';
import { {{pascal_case_name}}RequestSchema, {{pascal_case_name}}ResponseSchema } from '../schemas/{{camel_case_name}}.schema';

// RequestMapper const that maps a request schema to an entity
export const {{pascal_case_name}}RequestMapper = requestMapper({
  schemaValidator,
  domainSchema: {{pascal_case_name}}RequestSchema,
  _entityConstructor: {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record,
  mapperDefinition: {
    toEntity: async (dto{{^is_worker}}, em: EntityManager{{/is_worker}}) => {
      return {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record.create({
        ...dto,{{#is_worker}}
        processed: false,
        retryCount: 0,{{/is_worker}}
        createdAt: new Date(),
        updatedAt: new Date(),
      }{{^is_worker}}, em{{/is_worker}});
    }
  }
});

// ResponseMapper const that maps an entity to a response schema
export const {{pascal_case_name}}ResponseMapper = responseMapper({
  schemaValidator,
  domainSchema: {{pascal_case_name}}ResponseSchema,
  _entityConstructor: {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record,
  mapperDefinition: {
    toDto: async (entity: {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record) => {
      return await entity.read();
    }
  }
});

