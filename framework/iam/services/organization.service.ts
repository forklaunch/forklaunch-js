import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import { OrganizationService } from '../interfaces/organization.service.interface';
import {
  CreateOrganizationDto,
  CreateOrganizationDtoMapper,
  OrganizationDto,
  OrganizationDtoMapper,
  UpdateOrganizationDto,
  UpdateOrganizationDtoMapper
} from '../models/dtoMapper/organization.dtoMapper';
import { Organization } from '../models/persistence/organization.entity';

export default class BaseOrganizationService implements OrganizationService {
  constructor(public em: EntityManager) {}

  async createOrganization(
    organizationDto: CreateOrganizationDto,
    em?: EntityManager
  ): Promise<OrganizationDto> {
    const organization = CreateOrganizationDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      organizationDto
    );
    if (em) {
      await em.persist(organization);
    } else {
      await this.em.persistAndFlush(organization);
    }
    return OrganizationDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      organization
    );
  }

  async getOrganization(
    id: string,
    em?: EntityManager
  ): Promise<OrganizationDto> {
    return OrganizationDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Organization, { id })
    );
  }

  async updateOrganization(
    organizationDto: UpdateOrganizationDto,
    em?: EntityManager
  ): Promise<OrganizationDto> {
    const updatedOrganization =
      UpdateOrganizationDtoMapper.deserializeDtoToEntity(
        SchemaValidator(),
        organizationDto
      );
    await (em ?? this.em).upsert(updatedOrganization);
    if (!em) {
      await this.em.persistAndFlush(updatedOrganization);
    }
    return OrganizationDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      updatedOrganization
    );
  }

  async deleteOrganization(id: string, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Organization, { id });
  }
}
