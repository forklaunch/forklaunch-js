import { BaseEntity } from '@forklaunch/blueprint-core';
import { ArrayType, Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PlanCadenceEnum } from '../enum/planCadence.enum';

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

  @Enum(() => PlanCadenceEnum)
  cadence!: PlanCadenceEnum;

  // tie to permissions (slugs)
  @Property({ type: ArrayType, nullable: true })
  features!: string[];

  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;

  @Property()
  @Unique()
  externalId!: string;

  @Enum({ items: () => BillingProviderEnum, nullable: true })
  billingProvider?: BillingProviderEnum;
}
