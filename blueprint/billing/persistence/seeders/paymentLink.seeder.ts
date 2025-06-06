import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { PaymentLink } from '../entities/paymentLink.entity';
import { paymentLink } from '../seed.data';

export class PaymentLinkSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(PaymentLink, await paymentLink());
    return Promise.resolve();
  }
}
