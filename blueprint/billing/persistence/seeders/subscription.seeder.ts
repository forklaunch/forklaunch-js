import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Subscription } from '../entities/subscription.entity';
import { subscription } from '../seed.data';

export class SubscriptionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Subscription, await subscription(em));
    return Promise.resolve();
  }
}
