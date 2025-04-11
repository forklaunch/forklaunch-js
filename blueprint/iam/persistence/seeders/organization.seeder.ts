import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { organization } from '../seed.data';
import { Organization } from '../entities/organization.entity';

export class OrganizationSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Organization, organization);
    return Promise.resolve();
  }
}
