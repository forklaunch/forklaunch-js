import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { session } from '../../constants/seed.data';
import { Session } from '../persistence/session.entity';

export class SessionSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Session, session);
    return Promise.resolve();
  }
}
