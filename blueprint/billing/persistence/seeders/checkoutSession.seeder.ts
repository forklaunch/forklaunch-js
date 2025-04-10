import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { checkoutSession } from '../seed.data';
import { CheckoutSession } from '../entities/checkoutSession.entity';

export class CheckoutSessionSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(CheckoutSession, checkoutSession);
    return Promise.resolve();
  }
}
