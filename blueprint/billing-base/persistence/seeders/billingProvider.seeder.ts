import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { BillingProvider } from '../entities/billingProvider.entity';
import { billingProvider } from '../seed.data';

export class BillingProviderSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(BillingProvider, await billingProvider(em));
    return Promise.resolve();
  }
}
