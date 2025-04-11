import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Collection, Entity, ManyToMany, Property } from '@mikro-orm/core';
import { Permission } from './permission.entity';

@Entity()
export class Role extends SqlBaseEntity {
  @Property()
  name!: string;

  @ManyToMany(() => Permission)
  permissions = new Collection<Permission>(this);
}
