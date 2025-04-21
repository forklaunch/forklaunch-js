import { Entity, Property } from '@mikro-orm/core';
import { {{#is_mongo}}No{{/is_mongo}}SqlBaseEntity } from '@{{app_name}}/core';

// Entity class that defines the structure of the {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Recordtable
@Entity()
export class {{pascal_case_name}}{{#is_worker}}Event{{/is_worker}}Record extends {{#is_mongo}}No{{/is_mongo}}SqlBaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;{{#is_worker}}

  @Property()
  processed!: boolean;

  @Property()
  retryCount!: number;{{/is_worker}}
}
