import { BaseEntity } from '@forklaunch/framework-core';
import { Entity, Enum, Property } from '@mikro-orm/core';
import { CurrencyEnum } from '../enum/currency.enum';

// This is to represent connection information for a billing provider
@Entity()
export class PaymentLink extends BaseEntity {
  @Property()
  amount!: number;

  @Enum(() => CurrencyEnum)
  currency!: CurrencyEnum;

  @Property({ nullable: true })
  description?: string;

  @Property({ type: 'json', nullable: true })
  metadata?: unknown;

  @Property()
  successRedirectUri!: string;

  @Property()
  cancelRedirectUri!: string;

  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;
}
