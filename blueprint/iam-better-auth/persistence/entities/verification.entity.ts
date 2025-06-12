import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class Verification extends SqlBaseEntity {
  @Property()
  identifier!: string;

  @Property()
  value!: string;

  @Property()
  expiresAt!: Date;
}
