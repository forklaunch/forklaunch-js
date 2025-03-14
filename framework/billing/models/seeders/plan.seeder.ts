import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { plan } from '../../constants/seed.data';
import { Plan } from '../persistence/plan.entity';

export class PlanSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Plan, plan);
    return Promise.resolve();
  }
}
