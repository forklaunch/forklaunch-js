import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { plan } from '../seed.data';
import { Plan } from '../entities/plan.entity';

export class PlanSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Plan, plan);
    return Promise.resolve();
  }
}
