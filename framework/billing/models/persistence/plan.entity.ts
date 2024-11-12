import { BaseEntity } from '@forklaunch/core/database';
import { ArrayType, Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BillingProvider } from '../enum/billingProvider.enum';
import { PlanCadence } from '../enum/planCadence.enum';

@Entity()
export class Plan extends BaseEntity {
  @Property()
  active!: boolean;

  @Property()
  type!: string;

  @Property()
  name!: string;

  @Property()
  description?: string;

  @Property()
  price!: number;

  @Property()
  cadence!: PlanCadence;

  // tie to permissions (slugs)
  @Property({ type: ArrayType, nullable: true })
  features!: string[];

  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;

  @Property()
  @Unique()
  externalId!: string;

  @Enum({ items: () => BillingProvider, nullable: true })
  billingProvider?: BillingProvider;
}
