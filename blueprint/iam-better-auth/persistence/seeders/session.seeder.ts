import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Session } from '../entities/session.entity';
import { session } from '../seed.data';

export class SessionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Session, await session(em));
    return Promise.resolve();
  }
}
