import { EntityManager } from '@mikro-orm/core';
import {
  CreateOrganizationData,
  OrganizationService,
  UpdateOrganizationData
} from '../interfaces/organizationService.interface';
import { Organization } from '../models/persistence/organization.entity';

export default class BaseOrganizationService implements OrganizationService {
  constructor(public em: EntityManager) {}

  async createOrganization(
    data: CreateOrganizationData
  ): Promise<Organization> {
    console.log(await this.em.persistAndFlush(data));
    return data;
  }

  async getOrganization(id: string): Promise<Organization> {
    return await this.em.findOneOrFail(Organization, { id });
  }

  async updateOrganization(
    data: UpdateOrganizationData
  ): Promise<Organization> {
    const updatedOrganization = await this.em.upsert(data);
    console.log(updatedOrganization);
    await this.em.persistAndFlush(updatedOrganization);
    return data;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.em.nativeDelete(Organization, { id });
  }
}
