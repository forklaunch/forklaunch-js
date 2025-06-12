import { {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record } from './entities/{{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record.entity';
import { RequiredEntityData } from '@mikro-orm/core';
//! Begin seed data
export const {{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record = {
  message: 'Hello, world!'{{#is_worker}},
  processed: false,
  retryCount: 0{{/is_worker}},
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies RequiredEntityData<{{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record>;
