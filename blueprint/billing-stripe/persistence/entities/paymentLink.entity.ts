import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import {
  CurrencyEnum,
  PaymentMethodEnum
} from '@forklaunch/implementation-billing-stripe/enum';
import { Entity, Enum, Property } from '@mikro-orm/core';
import Stripe from 'stripe';
import { StatusEnum } from '../../domain/enum/status.enum';

// This is to represent connection information for a billing provider
@Entity()
export class PaymentLink extends SqlBaseEntity {
  @Property()
  amount!: number;

  @Enum(() => PaymentMethodEnum)
  paymentMethods!: PaymentMethodEnum[];

  @Enum(() => CurrencyEnum)
  currency!: CurrencyEnum;

  @Property({ nullable: true })
  description?: string;

  @Enum(() => StatusEnum)
  status!: StatusEnum;

  @Property({ type: 'json' })
  providerFields!: Stripe.PaymentLink;
}
