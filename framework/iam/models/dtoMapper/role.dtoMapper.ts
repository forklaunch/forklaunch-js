import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  date,
  optional,
  SchemaValidator,
  string,
  uuid
} from '@forklaunch/framework-core';
import { Collection } from '@mikro-orm/core';
import { Permission } from '../persistence/permission.entity';
import { Role } from '../persistence/role.entity';
import { PermissionDtoMapper } from './permission.dtoMapper';

export type CreateRoleDto = CreateRoleDtoMapper['dto'];
export class CreateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = {
    name: string,
    permissionIds: optional(array(string))
  };

  toEntity(permissions: Permission[]): Role {
    return Role.create({
      ...this.dto,
      permissions: new Collection(permissions)
    });
  }
}

export type UpdateRoleDto = UpdateRoleDtoMapper['dto'];
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
    return Role.update({
      ...this.dto,
      ...(permissions ? { permissions: new Collection(permissions) } : {})
    });
  }
}

const roleSchema = {
  id: uuid,
  name: string,
  permissions: array(PermissionDtoMapper.schema()),
  createdAt: date,
  updatedAt: date
};

export type RoleDto = RoleDtoMapper['dto'];
export class RoleDtoMapper extends ResponseDtoMapper<Role, SchemaValidator> {
  schema = roleSchema;

  fromEntity(entity: Role): this {
    this.dto = {
      ...entity.read(),
      permissions: entity.permissions.isInitialized()
        ? entity.permissions
            .getItems()
            .map((permission) =>
              PermissionDtoMapper.fromEntity(
                SchemaValidator(),
                permission
              ).toDto()
            )
        : []
    };

    return this;
  }
}

export class RoleEntityMapper extends RequestDtoMapper<Role, SchemaValidator> {
  schema = roleSchema;

  toEntity(): Role {
    return Role.map({
      ...this.dto,
      ...(this.dto.permissions
        ? {
            permissions: this.dto.permissions.map((permission) => permission.id)
          }
        : {})
      // permissions: new Collection(
      //   this.dto.permissions.map((permission) =>
      //     PermissionEntityMapper.deserializeDtoToEntity(
      //       this.schemaValidator as SchemaValidator,
      //       permission
      //     )
      //   )
      // )
    });
  }
}
