import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { Role } from '../../persistence/entities/role.entity';
import { User } from '../../persistence/entities/user.entity';
import { UserSchemas } from '../../registrations';
import { RoleMapper } from './role.mappers';

export const CreateUserMapper = requestMapper(
  schemaValidator,
  UserSchemas.CreateUserSchema,
  User,
  {
    toEntity: async (dto, em: EntityManager) => {
      return User.create(
        {
          ...dto,
          organization: await em.findOne(Organization, {
            id: dto.organization
          }),
          roles: await em.findAll(Role, {
            where: { id: { $in: dto.roles } }
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        em
      );
    }
  }
);

export const UpdateUserMapper = requestMapper(
  schemaValidator,
  UserSchemas.UpdateUserSchema,
  User,
  {
    toEntity: async (dto, em: EntityManager) => {
      return User.update(dto, em);
    }
  }
);

export const UserMapper = responseMapper(
  schemaValidator,
  UserSchemas.UserSchema,
  User,
  {
    toDto: async (entity: User) => {
      return {
        ...(await entity.read()),
        roles: await Promise.all(
          (entity.roles.isInitialized()
            ? entity.roles
            : await entity.roles.init()
          )
            .getItems()
            .map(async (role) => {
              // Use the mapper function directly to avoid circular dependency
              return RoleMapper.toDto(role);
            })
        )
      };
    }
  }
);
