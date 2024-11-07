import { BaseEntity } from '@forklaunch/core/database';
import { Entity, Enum, Property, Unique } from '@mikro-orm/core';

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

  @Enum({ items: () => BillingProvider, nullable: true })
  billingProvider?: BillingProvider;
}