import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Permission } from '../../persistence/entities/permission.entity';
import { PermissionSchemas } from '../schemas';

export const CreatePermissionMapper = requestMapper({
  schemaValidator,
  schema: PermissionSchemas.CreatePermissionSchema,
  entity: Permission,
  mapperDefinition: {
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
});

export const UpdatePermissionMapper = requestMapper({
  schemaValidator,
  schema: PermissionSchemas.UpdatePermissionSchema,
  entity: Permission,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return Permission.update(dto, em);
    }
  }
});

export const PermissionMapper = responseMapper({
  schemaValidator,
  schema: PermissionSchemas.PermissionSchema,
  entity: Permission,
  mapperDefinition: {
    toDto: async (entity: Permission) => {
      if (!entity.isInitialized()) {
        await entity.init();
      }

      return await entity.read();
    }
  }
});
