import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { ArrayType, Entity, Enum, Property, Unique } from '@mikro-orm/core';
import { BillingProviderEnum } from '../../domain/enum/billingProvider.enum';
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
