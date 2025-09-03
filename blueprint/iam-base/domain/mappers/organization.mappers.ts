import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { OrganizationStatus } from '../enum/organizationStatus.enum';
import { OrganizationSchemas } from '../schemas';
import { UserMapper } from './user.mappers';

export const CreateOrganizationMapper = requestMapper(
  schemaValidator,
  OrganizationSchemas.CreateOrganizationSchema,
  Organization,
  {
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
);

export const UpdateOrganizationMapper = requestMapper(
  schemaValidator,
  OrganizationSchemas.UpdateOrganizationSchema,
  Organization,
  {
    toEntity: async (dto, em: EntityManager) => {
      return Organization.update(dto, em);
    }
  }
);

export const OrganizationMapper = responseMapper(
  schemaValidator,
  OrganizationSchemas.OrganizationSchema(OrganizationStatus),
  Organization,
  {
    toDto: async (entity: Organization) => {
      return {
        ...(await entity.read()),
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
);
