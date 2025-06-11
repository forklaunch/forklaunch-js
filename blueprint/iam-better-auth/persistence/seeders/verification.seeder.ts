import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Verification } from '../entities/verification.entity';
import { verification } from '../seed.data';

export class VerificationSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Verification, await verification(em));
    return Promise.resolve();
  }
}
