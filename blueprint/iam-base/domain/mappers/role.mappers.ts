import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Role } from '../../persistence/entities/role.entity';
import { RoleSchemas } from '../../registrations';
import { PermissionMapper } from './permission.mappers';

export class CreateRoleMapper extends RequestMapper<Role, SchemaValidator> {
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

export class UpdateRoleMapper extends RequestMapper<Role, SchemaValidator> {
  schema = RoleSchemas.UpdateRoleSchema;

  async toEntity(em: EntityManager): Promise<Role> {
    return Role.update(this.dto, em);
  }
}

export class RoleMapper extends ResponseMapper<Role, SchemaValidator> {
  schema = RoleSchemas.RoleSchema;

  async fromEntity(entity: Role): Promise<this> {
    if (!entity.isInitialized()) {
      throw new Error('Role is not initialized');
    }

    this.dto = {
      ...(await entity.read()),
      permissions: await Promise.all(
        entity.permissions
          .getItems()
          .map(async (permission) =>
            (
              await PermissionMapper.fromEntity(
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

export class RoleEntityMapper extends RequestMapper<Role, SchemaValidator> {
  schema = RoleSchemas.UpdateRoleSchema;

  async toEntity(em: EntityManager): Promise<Role> {
    const role = await em.findOne(Role, this.dto.id);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  }
}
