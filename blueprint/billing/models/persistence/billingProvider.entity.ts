import { BaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BillingProviderEnum } from '../enum/billingProvider.enum';

// This is to represent connection information for a billing provider
@Entity()
export class BillingProvider extends BaseEntity {
  @Property({ nullable: true })
  @Unique()
  externalId?: string;

  // maybe include standardized auth fields if the same, if not, leverage the extraFields
  // store information here as well
  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;

  @Enum({ items: () => BillingProviderEnum, nullable: true })
  billingProvider?: BillingProviderEnum;
}
