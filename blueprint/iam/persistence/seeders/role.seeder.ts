import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Role } from '../entities/role.entity';
import { role } from '../seed.data';

export class RoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Role, await role());
    return Promise.resolve();
  }
}
