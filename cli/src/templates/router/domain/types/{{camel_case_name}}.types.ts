import { Schema } from '@forklaunch/validator';
import { SchemaValidator } from '@{{app_name}}/core';
import { {{pascal_case_name}}RequestSchema, {{pascal_case_name}}ResponseSchema } from '../schemas/{{camel_case_name}}.schema';

// Exported type that matches the request schema
export type {{pascal_case_name}}RequestDto = Schema<{{pascal_case_name}}RequestSchema, SchemaValidator>;

// Exported type that matches the response schema
export type {{pascal_case_name}}ResponseDto = Schema<{{pascal_case_name}}ResponseSchema, SchemaValidator>;