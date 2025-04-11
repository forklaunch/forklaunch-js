import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
  Unique
} from '@mikro-orm/core';
import { Organization } from './organization.entity';
import { Role } from './role.entity';

@Entity()
export class User extends SqlBaseEntity {
  @Property()
  @Unique()
  email!: string;

  @Property()
  passwordHash!: string;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ nullable: true })
  phoneNumber?: string;

  @ManyToOne(() => Organization, { nullable: true })
  organization?: Organization;

  @ManyToMany(() => Role)
  roles = new Collection<Role>(this);

  @Property()
  @Unique()
  subscription?: string;

  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;
}
