import { SqlBaseEntity } from '@forklaunch/blueprint-core';
import { Entity, Enum, Property } from '@mikro-orm/core';
import { PaymentMethodEnum } from '../../domain/enum/paymentMethod.enum';

// This is to represent connection information for a billing provider
@Entity()
export class CheckoutSession extends SqlBaseEntity {
  @Property()
  customerId!: string;

  @Enum(() => PaymentMethodEnum)
  paymentMethods!: PaymentMethodEnum[];

  @Property({ type: 'json', nullable: true })
  metadata?: unknown;

  @Property()
  successRedirectUri!: string;

  @Property()
  cancelRedirectUri!: string;

  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;
}
