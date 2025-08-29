import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { OrganizationStatus } from '../../domain/enum/organizationStatus.enum';
import { Organization } from '../../persistence/entities/organization.entity';
import { OrganizationSchemas } from '../../registrations';
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
    toDomain: async (entity: Organization) => {
      return {
        ...(await entity.read()),
        users: await Promise.all(
          entity.users
            .getItems()
            .map(async (user) => await UserMapper.toDomain(user))
        )
      };
    }
  }
);
