import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { User } from './user.entity';

@Entity()
export class Session extends SqlBaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @Property()
  token!: string;

  @Property()
  expiresAt!: Date;

  @Property()
  ipAddress?: string;

  @Property()
  userAgent?: string;
}
