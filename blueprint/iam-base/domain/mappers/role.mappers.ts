import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Role } from '../../persistence/entities/role.entity';
import { RoleSchemas } from '../schemas';
import { PermissionMapper } from './permission.mappers';

export const CreateRoleMapper = requestMapper(
  schemaValidator,
  RoleSchemas.CreateRoleSchema,
  Role,
  {
    toEntity: async (dto, em: EntityManager) => {
      return Role.create(
        {
          ...dto,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        em
      );
    }
  }
);

export const UpdateRoleMapper = requestMapper(
  schemaValidator,
  RoleSchemas.UpdateRoleSchema,
  Role,
  {
    toEntity: async (dto, em: EntityManager) => {
      return Role.update(dto, em);
    }
  }
);

export const RoleMapper = responseMapper(
  schemaValidator,
  RoleSchemas.RoleSchema,
  Role,
  {
    toDto: async (entity: Role) => {
      if (!entity.isInitialized()) {
        await entity.init();
      }

      return {
        ...(await entity.read()),
        permissions: await Promise.all(
          (entity.permissions && entity.permissions.isInitialized()
            ? entity.permissions
            : await entity.permissions.init()
          )
            .getItems()
            .map(async (permission) => {
              return PermissionMapper.toDto(permission);
            })
        )
      };
    }
  }
);

export const RoleEntityMapper = requestMapper(
  schemaValidator,
  RoleSchemas.UpdateRoleSchema,
  Role,
  {
    toEntity: async (dto, em: EntityManager) => {
      const role = await em.findOne(Role, dto.id);
      if (!role) {
        throw new Error('Role not found');
      }
      return role;
    }
  }
);
