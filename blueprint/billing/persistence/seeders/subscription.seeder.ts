import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { subscription } from '../seed.data';
import { Subscription } from '../entities/subscription.entity';

export class SubscriptionSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Subscription, subscription);
    return Promise.resolve();
  }
}
