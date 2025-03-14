import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { subscription } from '../../constants/seed.data';
import { Subscription } from '../persistence/subscription.entity';

export class SubscriptionSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Subscription, subscription);
    return Promise.resolve();
  }
}
