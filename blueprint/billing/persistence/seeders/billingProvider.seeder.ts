import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { billingProvider } from '../seed.data';
import { BillingProvider } from '../entities/billingProvider.entity';

export class BillingProviderSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(BillingProvider, billingProvider);
    return Promise.resolve();
  }
}
