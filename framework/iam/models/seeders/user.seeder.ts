import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { user } from '../../constants/seed.data';
import { User } from '../persistence/user.entity';

export class UserSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(User, user);
    return Promise.resolve();
  }
}
