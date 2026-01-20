import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { OrganizationStatus } from '../enum/organizationStatus.enum';
import { OrganizationSchemas } from '../schemas';
import { UserMapper } from './user.mappers';

export const CreateOrganizationMapper = requestMapper({
  schemaValidator,
  schema: OrganizationSchemas.CreateOrganizationSchema,
  entity: Organization,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return Organization.create(
        {
          ...dto,
          users: [],
          status: OrganizationStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        em
      );
    }
  }
});

export const UpdateOrganizationMapper = requestMapper({
  schemaValidator,
  schema: OrganizationSchemas.UpdateOrganizationSchema,
  entity: Organization,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return Organization.update(dto, em);
    }
  }
});

export const OrganizationMapper = responseMapper({
  schemaValidator,
  schema: OrganizationSchemas.OrganizationSchema(OrganizationStatus),
  entity: Organization,
  mapperDefinition: {
    toDto: async (entity: Organization) => {
      const entityData = await entity.read();

      return {
        ...entityData,
        logoUrl: entityData.logoUrl || undefined, // Convert null to undefined
        users: await Promise.all(
          (entity.users.isInitialized()
            ? entity.users
            : await entity.users.init()
          )
            .getItems()
            .map(async (user) => {
              // Use the mapper function directly to avoid circular dependency
              return UserMapper.toDto(user);
            })
        )
      };
    }
  }
});
