import { EntityManager } from '@mikro-orm/core';
import { OrganizationServiceParameters } from '../types/organization.service.types';

export interface OrganizationService<
  OrganizationStatus,
  Params extends
    OrganizationServiceParameters<OrganizationStatus> = OrganizationServiceParameters<OrganizationStatus>
> {
  createOrganization(
    organizationDto: Params['CreateOrganizationDto'],
    em?: EntityManager
  ): Promise<Params['OrganizationDto']>;
  getOrganization(
    idDto: Params['IdDto'],
    em?: EntityManager
  ): Promise<Params['OrganizationDto']>;
  updateOrganization(
    organizationDto: Params['UpdateOrganizationDto'],
    em?: EntityManager
  ): Promise<Params['OrganizationDto']>;
  deleteOrganization(idDto: Params['IdDto'], em?: EntityManager): Promise<void>;
}
