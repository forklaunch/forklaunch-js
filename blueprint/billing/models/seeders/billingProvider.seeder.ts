import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { billingProvider } from '../../constants/seed.data';
import { BillingProvider } from '../persistence/billingProvider.entity';

export class BillingProviderSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(BillingProvider, billingProvider);
    return Promise.resolve();
  }
}
