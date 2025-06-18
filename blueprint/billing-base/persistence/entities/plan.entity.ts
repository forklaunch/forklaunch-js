import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BillingProviderEnum } from '../../domain/enum/billingProvider.enum';
import { CurrencyEnum } from '../../domain/enum/currency.enum';
import { PlanCadenceEnum } from '../../domain/enum/planCadence.enum';

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

  @Property({ type: 'json', nullable: true })
  providerFields?: unknown;

  @Property()
  @Unique()
  externalId!: string;

  @Enum({ items: () => BillingProviderEnum, nullable: true })
  billingProvider?: BillingProviderEnum;
}
