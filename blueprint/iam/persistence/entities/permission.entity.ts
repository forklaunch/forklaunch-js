import { BaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class Permission extends BaseEntity {
  @Property()
  slug!: string;
}
