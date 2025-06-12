import { boolean, SchemaValidator, string } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { Role } from '../../persistence/entities/role.entity';
import { User } from '../../persistence/entities/user.entity';
import { UserSchemas } from '../../registrations';
import { RoleDtoMapper } from './role.mappers';

export class CreateUserDtoMapper extends RequestDtoMapper<
  User,
  SchemaValidator
> {
  schema = {
    ...UserSchemas.CreateUserSchema,
    name: string,
    emailVerified: boolean
  };

  async toEntity(em: EntityManager): Promise<User> {
    return User.create(
      {
        ...this.dto,
        organization: await em.findOne(Organization, {
          id: this.dto.organizationId
        }),
        roles: await em.findAll(Role, {
          where: { id: { $in: this.dto.roleIds } }
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdateUserDtoMapper extends RequestDtoMapper<
  User,
  SchemaValidator
> {
  schema = UserSchemas.UpdateUserSchema;

  async toEntity(em: EntityManager): Promise<User> {
    return User.update(this.dto, em);
  }
}

export class UserDtoMapper extends ResponseDtoMapper<User, SchemaValidator> {
  schema = UserSchemas.UserSchema;

  async fromEntity(entity: User): Promise<this> {
    this.dto = {
      ...(await entity.read()),
      roles: await Promise.all(
        entity.roles.map(async (role) =>
          (
            await RoleDtoMapper.fromEntity(
              this.schemaValidator as SchemaValidator,
              role
            )
          ).toDto()
        )
      )
    };

    return this;
  }
}
