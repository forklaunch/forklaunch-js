import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { array, optional, SchemaValidator, string, uuid } from 'core';
import { Permission } from '../persistence/permission.entity';

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
export class PermissionDtoMapper extends ResponseDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = {
    id: uuid,
    slug: string
  };

  fromEntity(entity: Permission): this {
    this.dto.id = entity.id;
    this.dto.slug = entity.slug;

    return this;
  }
}
