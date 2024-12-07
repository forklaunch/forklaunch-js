import { BaseEntity } from '@forklaunch/core/database';
import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PartyEnum } from '../enum/party.enum';

@Entity()
export class Subscription extends BaseEntity {
  // maybe have billing period here as well
  @Property()
  partyId!: string;

  @Property()
  partyType!: PartyEnum;

  @Property()
  description?: string;

  @Property()
  active!: boolean;

  // can make one to many, but for now, just store the id
  @Property()
  productId!: string;

  // access billing provider information pointer -- especially about entitlements, that can be grabbed later
  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;

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
