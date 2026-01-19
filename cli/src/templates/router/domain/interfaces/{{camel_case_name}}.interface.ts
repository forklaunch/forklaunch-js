{{#with_mappers}}import {
  {{pascal_case_name}}RequestDto,
  {{pascal_case_name}}ResponseDto
} from '../types/{{camel_case_name}}.types';{{/with_mappers}}{{^with_mappers}}import { Schema } from '@forklaunch/validator';
import { SchemaValidator } from '@{{app_name}}/core';
import {
  {{pascal_case_name}}RequestSchema,
  {{pascal_case_name}}ResponseSchema
} from '../schemas/{{camel_case_name}}.schema';

// When not using mappers, work directly with schema-validated types
type {{pascal_case_name}}Request = Schema<typeof {{pascal_case_name}}RequestSchema, SchemaValidator>;
type {{pascal_case_name}}Response = Schema<typeof {{pascal_case_name}}ResponseSchema, SchemaValidator>;{{/with_mappers}}

// Interface that defines the methods that the {{pascal_case_name}}Service must implement
export interface {{pascal_case_name}}Service {
  {{camel_case_name}}Post: ({{#with_mappers}}
    dto: {{pascal_case_name}}RequestDto
  ) => Promise<{{pascal_case_name}}ResponseDto>;{{/with_mappers}}{{^with_mappers}}
    data: {{pascal_case_name}}Request
  ) => Promise<{{pascal_case_name}}Response>;{{/with_mappers}}
}