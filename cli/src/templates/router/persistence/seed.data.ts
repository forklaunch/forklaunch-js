import { {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record } from './entities/{{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record.entity';
//! Begin seed data
export const {{camel_case_name}}{{#is_worker}}Event{{/is_worker}}Record = async () => {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record.create({
  message: 'Hello, world!'{{#is_worker}},
  processed: false,
  retryCount: 0{{/is_worker}}
});
