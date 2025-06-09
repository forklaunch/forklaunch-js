import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { collection } from '@forklaunch/core/persistence';
import { Permission } from '../../persistence/entities/permission.entity';
import { Role } from '../../persistence/entities/role.entity';
import { RoleSchemas } from '../../registrations';
import { PermissionDtoMapper } from './permission.mappers';
export class CreateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = RoleSchemas.CreateRoleSchema;

  async toEntity(): Promise<Role> {
    return Role.create({
      ...this.dto,
      permissions: collection(
        this.dto.permissionIds
          ? await Promise.all(
              this.dto.permissionIds.map(async (id) =>
                Permission.map({
                  id
                })
              )
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

  async toEntity(): Promise<Role> {
    return Role.update({
      ...this.dto,
      ...(this.dto.permissionIds
        ? {
            permissions: collection(
              await Promise.all(
                this.dto.permissionIds.map(async (id) =>
                  Permission.map({
                    id
                  })
                )
              )
            )
          }
        : {})
    });
  }
}

export class RoleDtoMapper extends ResponseDtoMapper<Role, SchemaValidator> {
  schema = RoleSchemas.RoleSchema;

  async fromEntity(entity: Role): Promise<this> {
    this.dto = {
      ...(await entity.read()),
      permissions: entity.permissions.isInitialized()
        ? await Promise.all(
            entity.permissions
              .getItems()
              .map(async (permission) =>
                (
                  await PermissionDtoMapper.fromEntity(
                    SchemaValidator(),
                    permission
                  )
                ).toDto()
              )
          )
        : []
    };

    return this;
  }
}

export class RoleEntityMapper extends RequestDtoMapper<Role, SchemaValidator> {
  schema = RoleSchemas.RoleSchema;

  async toEntity(): Promise<Role> {
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
