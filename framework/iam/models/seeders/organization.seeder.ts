import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { organization } from '../../constants/seed.data';
import { Organization } from '../persistence/organization.entity';

export class OrganizationSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    em.create(Organization, organization);
    return Promise.resolve();
  }
}
