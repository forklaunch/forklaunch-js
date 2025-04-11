import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Enum, Property } from '@mikro-orm/core';
import { CurrencyEnum } from '../../domain/enum/currency.enum';

// This is to represent connection information for a billing provider
@Entity()
export class PaymentLink extends SqlBaseEntity {
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
