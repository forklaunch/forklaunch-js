import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Property } from '@mikro-orm/core';

@Entity()
export class StripeWebhookEvent extends SqlBaseEntity {
  @Property()
  stripeId!: string;

  @Property()
  idempotencyKey!: string;

  @Property()
  eventType!: string;

  @Property({ type: 'json' })
  eventData!: unknown;
}
