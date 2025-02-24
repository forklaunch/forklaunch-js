import { BaseEntity } from '@forklaunch/framework-core';
import { Entity, Enum, Property } from '@mikro-orm/core';
import { PaymentMethodEnum } from '../enum/paymentMethod.enum';

// This is to represent connection information for a billing provider
@Entity()
export class Session extends BaseEntity {
  @Property()
  customerEmail!: string;

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
