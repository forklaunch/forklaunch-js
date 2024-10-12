import { EntityManager } from '@mikro-orm/core';
import {
  CreateOrganizationData,
  OrganizationService,
  UpdateOrganizationData
} from '../interfaces/organizationService.interface';
import { Organization } from '../models/persistence/organization.entity';

export default class BaseOrganizationService implements OrganizationService {
  constructor(public em: EntityManager) {}

  async createOrganization(data: CreateOrganizationData): Promise<void> {
    console.log(data);
    await this.em.persistAndFlush(data);
  }

  async getOrganization(id: string): Promise<Organization> {
    return await this.em.findOneOrFail(Organization, { id });
  }

  async updateOrganization(data: UpdateOrganizationData): Promise<void> {
    const updatedOrganization = await this.em.upsert(data);
    await this.em.persistAndFlush(updatedOrganization);
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.em.nativeDelete(Organization, { id });
  }
}
