import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import {
  BillingProviderEnum,
  CurrencyEnum,
  PlanCadenceEnum
} from '@forklaunch/implementation-billing-stripe/enum';
import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import Stripe from 'stripe';

@Entity()
export class Plan extends SqlBaseEntity {
  @Property()
  active!: boolean;

  @Property()
  name!: string;

  @Property()
  description?: string;

  @Property()
  price!: number;

  @Enum(() => CurrencyEnum)
  currency!: CurrencyEnum;

  @Enum(() => PlanCadenceEnum)
  cadence!: PlanCadenceEnum;

  // tie to permissions (slugs)
  @Property({ nullable: true })
  features?: string[];

  @Property({ type: 'json' })
  providerFields!: Stripe.Plan;

  @Property()
  @Unique()
  externalId!: string;

  @Enum({ items: () => BillingProviderEnum, nullable: true })
  billingProvider?: BillingProviderEnum;
}
