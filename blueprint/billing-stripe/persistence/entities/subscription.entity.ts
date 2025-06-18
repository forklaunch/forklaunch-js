import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { BillingProviderEnum } from '@forklaunch/implementation-billing-stripe/domain';
import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import Stripe from 'stripe';
import { PartyEnum } from '../../domain/enum/party.enum';

@Entity()
export class Subscription extends SqlBaseEntity {
  // maybe have billing period here as well
  @Property()
  partyId!: string;

  @Enum(() => PartyEnum)
  partyType!: PartyEnum;

  @Property()
  description?: string;

  @Property()
  active!: boolean;

  // can make one to many, but for now, just store the id
  @Property()
  productId!: string;

  // access billing provider information pointer -- especially about entitlements, that can be grabbed later
  @Property({ type: 'json' })
  providerFields!: Stripe.Subscription;

  @Property()
  @Unique()
  externalId!: string;

  @Enum({ items: () => BillingProviderEnum, nullable: true })
  billingProvider?: BillingProviderEnum;

  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date;

  @Property()
  status!: string;
}
