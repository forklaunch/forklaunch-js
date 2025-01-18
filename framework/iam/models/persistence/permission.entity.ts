import { BaseEntity } from '@forklaunch/framework-core';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class Permission extends BaseEntity {
  @Property()
  slug!: string;
}
