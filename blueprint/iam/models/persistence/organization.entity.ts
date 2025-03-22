import { BaseEntity } from '@forklaunch/framework-core';
import {
  Collection,
  Entity,
  OneToMany,
  Property,
  Unique
} from '@mikro-orm/core';
import { User } from './user.entity';

// Enum for Organization Status
export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// Experiment with importing types from another service and see if it generates entity. The goal is to not generate an entity, but to have an object serialization
@Entity()
export class Organization extends BaseEntity {
  @Property()
  name!: string;

  @OneToMany(
    () => User,
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
