import { BaseEntity } from '@forklaunch/core/database';
import { Entity, Property } from '@mikro-orm/core';
import { PaymentMethod } from '../enum/paymentMethod.enum';

// This is to represent connection information for a billing provider
@Entity()
export class Session extends BaseEntity {
  @Property()
  customerEmail!: string;

  @Property()
  paymentMethods!: PaymentMethod[];

  @Property({ type: 'json', nullable: true })
  metadata?: unknown;

  @Property()
  successRedirectUri!: string;

  @Property()
  cancelRedirectUri!: string;

  @Property({ type: 'json', nullable: true })
  extraFields?: unknown;
}
