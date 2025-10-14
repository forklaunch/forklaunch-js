import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import {
  Collection,
  Entity,
  OneToMany,
  Property,
  Unique
} from '@mikro-orm/core';
import { OrganizationStatus } from '../../domain/enum/organizationStatus.enum';
import type { User } from './user.entity';

// Experiment with importing types from another service and see if it generates entity. The goal is to not generate an entity, but to have an object serialization
@Entity()
export class Organization extends SqlBaseEntity {
  @Property()
  name!: string;

  @OneToMany(
    () => 'User',
    (user: { organization: Organization }) => user.organization
  )
  users = new Collection<User>(this);

  @Property()
  domain!: string;

  @Property({ nullable: true })
  logoUrl?: string;

  @Property()
  @Unique()
  subscription!: string;

  @Property()
  status: OrganizationStatus = OrganizationStatus.ACTIVE;
}
