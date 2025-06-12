import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Role } from '../../persistence/entities/role.entity';
import { RoleSchemas } from '../../registrations';
import { PermissionDtoMapper } from './permission.mappers';

export class CreateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = RoleSchemas.CreateRoleSchema;

  async toEntity(em: EntityManager): Promise<Role> {
    return Role.create(
      {
        ...this.dto,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdateRoleDtoMapper extends RequestDtoMapper<
  Role,
  SchemaValidator
> {
  schema = RoleSchemas.UpdateRoleSchema;

  async toEntity(em: EntityManager): Promise<Role> {
    return Role.update(this.dto, em);
  }
}

export class RoleDtoMapper extends ResponseDtoMapper<Role, SchemaValidator> {
  schema = RoleSchemas.RoleSchema;

  async fromEntity(entity: Role): Promise<this> {
    if (!entity.isInitialized()) {
      throw new Error('Role is not initialized');
    }

    this.dto = {
      ...(await entity.read()),
      permissions: await Promise.all(
        entity.permissions.map(async (permission) =>
          (
            await PermissionDtoMapper.fromEntity(
              this.schemaValidator as SchemaValidator,
              permission
            )
          ).toDto()
        )
      )
    };
    return this;
  }
}

export class RoleEntityMapper extends RequestDtoMapper<Role, SchemaValidator> {
  schema = RoleSchemas.UpdateRoleSchema;

  async toEntity(em: EntityManager): Promise<Role> {
    const role = await em.findOne(Role, this.dto.id);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }
}
