import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { Account } from '../entities/account.entity';
import { account } from '../seed.data';

export class AccountSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Account, await account(em));
    return Promise.resolve();
  }
}
