import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreatePermissionDto = Partial<IdDto> & {
  slug: string;
  addToRolesIds?: string[];
  providerFields?: unknown;
};
export type UpdatePermissionDto = Partial<CreatePermissionDto> &
  IdDto & {
    removeFromRolesIds?: string[];
  };
export type PermissionDto = CreatePermissionDto &
  IdDto &
  Partial<RecordTimingDto> & {
    slug: string;
    providerFields?: unknown;
  };

export type PermissionServiceParameters = {
  CreatePermissionDto: CreatePermissionDto;
  PermissionDto: PermissionDto;
  UpdatePermissionDto: UpdatePermissionDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
