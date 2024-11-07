// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import {
  CreateOrganizationDto,
  OrganizationDto,
  UpdateOrganizationDto
} from '../models/dtoMapper/organization.dtoMapper';
import { Organization } from '../models/persistence/organization.entity';

export interface OrganizationService extends BaseService {
  createOrganization(
    organizationDto: CreateOrganizationDto
  ): Promise<OrganizationDto>;
  getOrganization(id: string): Promise<Organization>;
  updateOrganization(
    organizationDto: UpdateOrganizationDto
  ): Promise<OrganizationDto>;
  deleteOrganization(id: string): Promise<void>;
}
