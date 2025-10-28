import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { User } from './user.entity';

@Entity()
export class Account extends SqlBaseEntity {
  @ManyToOne('User')
  user!: User;

  @Property()
  accountId!: string;

  @Property()
  providerId!: string;

  @Property()
  accessToken?: string;

  @Property()
  refreshToken?: string;

  @Property()
  accessTokenExpiresAt?: Date;

  @Property()
  refreshTokenExpiresAt?: Date;

  @Property()
  scope?: string;

  @Property()
  idToken?: string;

  @Property()
  password?: string;
}
