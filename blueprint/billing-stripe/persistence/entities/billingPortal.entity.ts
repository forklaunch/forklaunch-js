import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Property } from '@mikro-orm/core';
import Stripe from 'stripe';

// This is to represent connection information for a billing provider
@Entity()
export class BillingPortal extends SqlBaseEntity {
  @Property()
  customerId!: string;

  @Property({ nullable: true })
  uri?: string;

  @Property()
  expiresAt!: Date;

  @Property({ type: 'json' })
  providerFields!: Stripe.BillingPortal.Session;
}
