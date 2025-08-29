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
export class CheckoutSession extends SqlBaseEntity {
  @Property()
  customerId!: string;

  @Enum(() => PaymentMethodEnum)
  paymentMethods!: PaymentMethodEnum[];

  @Enum(() => CurrencyEnum)
  currency!: CurrencyEnum;

  @Property()
  uri!: string;

  @Property({ nullable: true })
  successRedirectUri?: string;

  @Property({ nullable: true })
  cancelRedirectUri?: string;

  @Property()
  expiresAt!: Date;

  @Enum(() => StatusEnum)
  status!: StatusEnum;

  @Property({ type: 'json' })
  providerFields!: Stripe.Checkout.Session;
}
