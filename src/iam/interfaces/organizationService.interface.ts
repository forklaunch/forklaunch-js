// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import { Organization } from '../models/persistence/organization.entity';

export type CreateOrganizationData = Organization;
export type UpdateOrganizationData = CreateOrganizationData;

export interface OrganizationService extends BaseService {
  createOrganization(data: CreateOrganizationData): Promise<void>;
  getOrganization(id: string): Promise<Organization>;
  updateOrganization(data: UpdateOrganizationData): Promise<void>;
  deleteOrganization(id: string): Promise<void>;
}
