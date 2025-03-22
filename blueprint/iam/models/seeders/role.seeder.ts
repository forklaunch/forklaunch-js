import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { role } from '../../constants/seed.data';
import { Role } from '../persistence/role.entity';

export class RoleSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Role, role);
    return Promise.resolve();
  }
}
