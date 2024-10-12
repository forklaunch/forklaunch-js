import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { Collection } from '@mikro-orm/core';
import { array, optional, SchemaValidator, string, uuid } from 'core';
import { Permission } from '../persistence/permission.entity';
import { Role } from '../persistence/role.entity';
import { PermissionDtoMapper } from './permission.dtoMapper';

export class CreateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = {
    name: string,
    permissionIds: optional(array(string))
  };

  toEntity(permissions: Permission[]): Role {
    const role = new Role();
    role.name = this.dto.name;
    role.permissions = new Collection(role, permissions);

    return role;
  }
}

export class UpdateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = {
    id: uuid,
    name: optional(string),
    permissionIds: optional(array(string))
  };

  toEntity(permissions: Permission[]): Role {
    const role = new Role();
    role.id = this.dto.id;
    if (this.dto.name) {
      role.name = this.dto.name;
    }
    if (permissions) {
      role.permissions = new Collection(role, permissions);
    }

    return role;
  }
}

export class RoleDtoMapper extends ResponseDtoMapper<Role, SchemaValidator> {
  schema = {
    id: uuid,
    name: string,
    permissions: array(PermissionDtoMapper.schema())
  };

  fromEntity(entity: Role): this {
    this.dto.id = entity.id;
    this.dto.name = entity.name;
    this.dto.permissions = entity.permissions.isInitialized()
      ? entity.permissions
          .getItems()
          .map((permission) =>
            PermissionDtoMapper.fromEntity(
              SchemaValidator(),
              permission
            ).toJson()
          )
      : [];

    return this;
  }
}
