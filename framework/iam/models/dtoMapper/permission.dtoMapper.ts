import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  optional,
  SchemaValidator,
  string,
  uuid
} from '@forklaunch/framework-core';
import { Permission } from '../persistence/permission.entity';

export type CreatePermissionDto = CreatePermissionDtoMapper['dto'];
export class CreatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = {
    slug: string,
    addToRolesIds: optional(array(string))
  };

  toEntity(): Permission {
    const permission = new Permission();
    permission.slug = this.dto.slug;

    return permission;
  }
}

export type UpdatePermissionDto = UpdatePermissionDtoMapper['dto'];
export class UpdatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = {
    id: uuid,
    slug: optional(string),
    addToRolesIds: optional(array(string)),
    removeFromRolesIds: optional(array(string))
  };

  toEntity(): Permission {
    const permission = new Permission();
    permission.id = this.dto.id;
    if (this.dto.slug) {
      permission.slug = this.dto.slug;
    }

    return permission;
  }
}

export type PermissionDto = PermissionDtoMapper['dto'];
export class PermissionDtoMapper extends ResponseDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = {
    id: uuid,
    slug: string
  };

  fromEntity(entity: Permission): this {
    this.dto = {
      id: entity.id,
      slug: entity.slug
    };

    return this;
  }
}
