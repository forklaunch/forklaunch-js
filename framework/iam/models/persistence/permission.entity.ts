import { BaseEntity } from '@forklaunch/core/database';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class Permission extends BaseEntity {
  @Property()
  slug!: string;
}
