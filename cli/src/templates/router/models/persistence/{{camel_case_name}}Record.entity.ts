import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@{{app_name}}/core';

// Entity class that defines the structure of the {{pascal_case_name}}Record table
@Entity()
export class {{pascal_case_name}}Record extends BaseEntity {
  // message property that stores a message string
  @Property()
  message!: string;
}
