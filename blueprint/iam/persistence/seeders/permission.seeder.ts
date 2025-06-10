import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Permission } from '../entities/permission.entity';
import { permission } from '../seed.data';

export class PermissionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Permission, await permission(em));
    return Promise.resolve();
  }
}
