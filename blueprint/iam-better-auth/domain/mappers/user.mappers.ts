import { boolean, SchemaValidator, string } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { Role } from '../../persistence/entities/role.entity';
import { User } from '../../persistence/entities/user.entity';
import { UserSchemas } from '../../registrations';
import { RoleMapper } from './role.mappers';

export class CreateUserMapper extends RequestMapper<User, SchemaValidator> {
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
          id: this.dto.organization
        }),
        roles: await em.findAll(Role, {
          where: { id: { $in: this.dto.roles } }
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdateUserMapper extends RequestMapper<User, SchemaValidator> {
  schema = UserSchemas.UpdateUserSchema;

  async toEntity(em: EntityManager): Promise<User> {
    return User.update(this.dto, em);
  }
}

export class UserMapper extends ResponseMapper<User, SchemaValidator> {
  schema = UserSchemas.UserSchema;

  async fromEntity(entity: User): Promise<this> {
    this.dto = {
      ...(await entity.read()),
      roles: await Promise.all(
        entity.roles
          .getItems()
          .map(async (role) =>
            (
              await RoleMapper.fromEntity(
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
