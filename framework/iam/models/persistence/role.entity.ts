import { BaseEntity } from '@forklaunch/core/database';
import { Collection, Entity, ManyToMany, Property } from '@mikro-orm/core';
import { Permission } from './permission.entity';

@Entity()
export class Role extends BaseEntity {
  @Property()
  name!: string;

  @ManyToMany(() => Permission)
  permissions = new Collection<Permission>(this);
}
