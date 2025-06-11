import { {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record } from './entities/{{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record.entity';{{^is_worker}} 
import { EntityManager } from '@mikro-orm/core';{{/is_worker}}
//! Begin seed data
export const {{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record = async ({{^is_worker}}em: EntityManager{{/is_worker}}) => {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record.create({
  message: 'Hello, world!'{{#is_worker}},
  processed: false,
  retryCount: 0{{/is_worker}},
  createdAt: new Date(),
  updatedAt: new Date()
}{{^is_worker}}, em{{/is_worker}});
