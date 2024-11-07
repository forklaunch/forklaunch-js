import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import { OrganizationService } from '../interfaces/organizationService.interface';
import {
  CreateOrganizationDto,
  CreateOrganizationDtoMapper,
  OrganizationDto,
  OrganizationDtoMapper,
  UpdateOrganizationDto
} from '../models/dtoMapper/organization.dtoMapper';
import { Organization } from '../models/persistence/organization.entity';

export default class BaseOrganizationService implements OrganizationService {
  constructor(public em: EntityManager) {}

  async createOrganization(
    organizationDto: CreateOrganizationDto
  ): Promise<OrganizationDto> {
    const organization = CreateOrganizationDtoMapper.deserializeJsonToEntity(
      SchemaValidator(),
      organizationDto
    );

    await this.em.persistAndFlush(
      CreateOrganizationDtoMapper.deserializeJsonToEntity(
        SchemaValidator(),
        organizationDto
      )
    );

    return OrganizationDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      organization
    );
  }

  async getOrganization(id: string): Promise<Organization> {
    return await this.em.findOneOrFail(Organization, { id });
  }

  async updateOrganization(
    organizationDto: UpdateOrganizationDto
  ): Promise<OrganizationDto> {
    const updatedOrganization = await this.em.upsert(organizationDto);
    await this.em.persistAndFlush(updatedOrganization);
    return updatedOrganization;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.em.nativeDelete(Organization, { id });
  }
}
