import { IdDto, RecordTimingDto } from '@forklaunch/common';
import { EntityManager } from '@mikro-orm/core';
import { UserDto } from './user.service.interface';

export type CreateOrganizationDto = {
  name: string;
  domain: string;
  subscription: string;
  logoUrl?: string;
  extraFields?: unknown;
};
export type UpdateOrganizationDto = IdDto & Partial<CreateOrganizationDto>;
export type OrganizationDto<OrganizationStatus> = IdDto &
  CreateOrganizationDto &
  Partial<RecordTimingDto> & {
    users: UserDto[];
    status: OrganizationStatus[keyof OrganizationStatus];
  };

export type OrganizationServiceParameters<OrganizationStatus> = {
  CreateOrganizationDto: CreateOrganizationDto;
  OrganizationDto: OrganizationDto<OrganizationStatus>;
  UpdateOrganizationDto: UpdateOrganizationDto;
  IdDto: IdDto;
};

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
