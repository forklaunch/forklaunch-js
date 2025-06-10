import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Plan } from '../entities/plan.entity';
import { plan } from '../seed.data';

export class PlanSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Plan, await plan(em));
    return Promise.resolve();
  }
}
