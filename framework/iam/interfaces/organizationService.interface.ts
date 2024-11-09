// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import { EntityManager } from '@mikro-orm/core';
import {
  CreateOrganizationDto,
  OrganizationDto,
  UpdateOrganizationDto
} from '../models/dtoMapper/organization.dtoMapper';

export interface OrganizationService extends BaseService {
  createOrganization(
    organizationDto: CreateOrganizationDto,
    em?: EntityManager
  ): Promise<OrganizationDto>;
  getOrganization(id: string, em?: EntityManager): Promise<OrganizationDto>;
  updateOrganization(
    organizationDto: UpdateOrganizationDto,
    em?: EntityManager
  ): Promise<OrganizationDto>;
  deleteOrganization(id: string, em?: EntityManager): Promise<void>;
}
