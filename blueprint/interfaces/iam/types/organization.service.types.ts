import { IdDto, RecordTimingDto } from '@forklaunch/common';
import { UserDto } from './user.service.types';

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
