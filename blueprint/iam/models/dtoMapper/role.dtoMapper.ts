import { collection, SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { RoleSchemas } from '../../registrations';
import { Permission } from '../persistence/permission.entity';
import { Role } from '../persistence/role.entity';
import { PermissionDtoMapper } from './permission.dtoMapper';
export class CreateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = RoleSchemas.CreateRoleSchema;

  toEntity(): Role {
    return Role.create({
      ...this.dto,
      permissions: collection(
        this.dto.permissionIds
          ? this.dto.permissionIds.map((id) =>
              Permission.map({
                id
              })
            )
          : []
      )
    });
  }
}

export class UpdateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = RoleSchemas.UpdateRoleSchema;

  toEntity(): Role {
    return Role.update({
      ...this.dto,
      ...(this.dto.permissionIds
        ? {
            permissions: collection(
              this.dto.permissionIds.map((id) => Permission.map({ id }))
            )
          }
        : {})
    });
  }
}

export class RoleDtoMapper extends ResponseDtoMapper<Role, SchemaValidator> {
  schema = RoleSchemas.RoleSchema;

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
  schema = RoleSchemas.RoleSchema;

  toEntity(): Role {
    return Role.map({
      ...this.dto,
      ...(this.dto.permissions
        ? {
            permissions: this.dto.permissions.map((permission) => permission.id)
          }
        : {})
    });
  }
}
