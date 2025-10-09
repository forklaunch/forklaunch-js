import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
  Unique
} from '@mikro-orm/core';
import type { Organization } from './organization.entity';
import type { Role } from './role.entity';

@Entity()
export class User extends SqlBaseEntity {
  @Property()
  @Unique()
  email!: string;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ nullable: true })
  phoneNumber?: string;

  @ManyToOne({ nullable: true })
  organization?: Organization;

  @ManyToMany()
  roles = new Collection<Role>(this);

  @Property()
  @Unique()
  subscription?: string;

  @Property({ type: 'json', nullable: true })
  providerFields?: unknown;
}
