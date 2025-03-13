import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { permission } from '../../constants/seed.data';
import { Permission } from '../persistence/permission.entity';

export class PermissionSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Permission, permission);
    return Promise.resolve();
  }
}
