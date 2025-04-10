import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { paymentLink } from '../seed.data';
import { PaymentLink } from '../entities/paymentLink.entity';

export class PaymentLinkSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(PaymentLink, paymentLink);
    return Promise.resolve();
  }
}
