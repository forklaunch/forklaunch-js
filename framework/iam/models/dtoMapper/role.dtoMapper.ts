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
import {
  PermissionDtoMapper,
  PermissionEntityMapper
} from './permission.dtoMapper';

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
    const role = new Role();
    role.name = this.dto.name;
    role.permissions = new Collection(role, permissions);

    return role;
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
      id: entity.id,
      name: entity.name,
      permissions: entity.permissions.isInitialized()
        ? entity.permissions
            .getItems()
            .map((permission) =>
              PermissionDtoMapper.fromEntity(
                SchemaValidator(),
                permission
              ).toDto()
            )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    return this;
  }
}

export class RoleEntityMapper extends RequestDtoMapper<Role, SchemaValidator> {
  schema = roleSchema;

  toEntity(): Role {
    const role = new Role();
    role.id = this.dto.id;
    role.name = this.dto.name;
    role.permissions = new Collection(
      role,
      this.dto.permissions.map((permission) =>
        PermissionEntityMapper.deserializeDtoToEntity(
          this.schemaValidator as SchemaValidator,
          permission
        )
      )
    );
    role.createdAt = this.dto.createdAt;
    role.updatedAt = this.dto.updatedAt;
    return role;
  }
}
