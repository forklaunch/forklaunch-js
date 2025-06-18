import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Property } from '@mikro-orm/core';

// This is to represent connection information for a billing provider
@Entity()
export class BillingPortal extends SqlBaseEntity {
  @Property()
  customerId!: string;

  @Property({ nullable: true })
  uri?: string;

  @Property()
  expiresAt!: Date;

  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;
}
