import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Permission } from '../../persistence/entities/permission.entity';
import { PermissionSchemas } from '../../registrations';

export const CreatePermissionMapper = requestMapper(
  schemaValidator,
  PermissionSchemas.CreatePermissionSchema,
  Permission,
  {
    toEntity: async (dto, em: EntityManager) => {
      return Permission.create(
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

export const UpdatePermissionMapper = requestMapper(
  schemaValidator,
  PermissionSchemas.UpdatePermissionSchema,
  Permission,
  {
    toEntity: async (dto, em: EntityManager) => {
      return Permission.update(dto, em);
    }
  }
);

export const PermissionMapper = responseMapper(
  schemaValidator,
  PermissionSchemas.PermissionSchema,
  Permission,
  {
    toDto: async (entity: Permission) => {
      return await entity.read();
    }
  }
);
