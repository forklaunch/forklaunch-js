import { {{pascal_case_name}}Record } from '../models/persistence/{{camel_case_name}}Record.entity';

export const {{camel_case_name}}Record = {{pascal_case_name}}Record.create({
  message: 'Hello, world!',{{#is_worker}}
  processed: false,
  retryCount: 0{{/is_worker}}
});
