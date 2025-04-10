import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';

export type CreatePermissionDto = {
  slug: string;
  addToRolesIds?: string[];
  extraFields?: unknown;
};
export type UpdatePermissionDto = IdDto &
  Partial<CreatePermissionDto> & {
    removeFromRolesIds?: string[];
  };
export type PermissionDto = IdDto &
  Partial<RecordTimingDto> & {
    slug: string;
  };

export type PermissionServiceParameters = {
  CreatePermissionDto: CreatePermissionDto;
  PermissionDto: PermissionDto;
  UpdatePermissionDto: UpdatePermissionDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
