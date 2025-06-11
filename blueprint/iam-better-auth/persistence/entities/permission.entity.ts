import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class Permission extends SqlBaseEntity {
  @Property()
  slug!: string;
}
