import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Enum, Property } from '@mikro-orm/core';
import { CurrencyEnum } from '../../domain/enum/currency.enum';
import { PaymentMethodEnum } from '../../domain/enum/paymentMethod.enum';
import { StatusEnum } from '../../domain/enum/status.enum';

// This is to represent connection information for a billing provider
@Entity()
export class CheckoutSession extends SqlBaseEntity {
  @Property()
  customerId!: string;

  @Enum(() => PaymentMethodEnum)
  paymentMethods!: PaymentMethodEnum[];

  @Enum(() => CurrencyEnum)
  currency!: CurrencyEnum;

  @Property({ nullable: true })
  successRedirectUri?: string;

  @Property({ nullable: true })
  cancelRedirectUri?: string;

  @Property()
  expiresAt!: Date;

  @Enum(() => StatusEnum)
  status!: StatusEnum;

  @Property({ type: 'json', nullable: true })
  providerFields?: unknown;
}
