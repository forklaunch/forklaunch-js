import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Role } from '../entities/role.entity';
import { role } from '../seed.data';

export class RoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const createdRole = em.create(Role, role);
    return em.persistAndFlush(createdRole);
  }
}
