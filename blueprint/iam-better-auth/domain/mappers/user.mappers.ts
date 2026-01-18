import { boolean, schemaValidator, string } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { Role } from '../../persistence/entities/role.entity';
import { User } from '../../persistence/entities/user.entity';
import { UserSchemas } from '../schemas';
import { RoleMapper } from './role.mappers';

export const CreateUserMapper = requestMapper({
  schemaValidator,
  schema: {
    ...UserSchemas.CreateUserSchema,
    name: string,
    emailVerified: boolean
  },
  entity: User,
  mapperDefinition: {
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
});

export const UpdateUserMapper = requestMapper({
  schemaValidator,
  schema: UserSchemas.UpdateUserSchema,
  entity: User,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return User.update(dto, em);
    }
  }
});

export const UserMapper = responseMapper({
  schemaValidator,
  schema: UserSchemas.UserSchema,
  entity: User,
  mapperDefinition: {
    toDto: async (entity: User) => {
      return {
        ...(await entity.read()),
        roles: await Promise.all(
          (entity.roles.isInitialized()
            ? entity.roles
            : await entity.roles.init()
          )
            .getItems()
            .map(async (role) => RoleMapper.toDto(role))
        )
      };
    }
  }
});
