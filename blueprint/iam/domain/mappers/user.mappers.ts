import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { collection } from '@forklaunch/core/persistence';
import { Organization } from '../../persistence/entities/organization.entity';
import { Role } from '../../persistence/entities/role.entity';
import { User } from '../../persistence/entities/user.entity';
import { UserSchemas } from '../../registrations';
import { passwordEncrypt } from '../../utils/passwordEncrypt';
import { RoleDtoMapper } from './role.mappers';

export class CreateUserDtoMapper extends RequestDtoMapper<
  User,
  SchemaValidator
> {
  schema = UserSchemas.CreateUserSchema;

  async toEntity(passwordEncryptionPublicKeyPath: string): Promise<User> {
    return User.create({
      ...this.dto,
      organization: await Organization.map({
        id: this.dto.organizationId
      }),
      roles: collection(
        await Promise.all(this.dto.roleIds.map((id) => Role.map({ id })))
      ),
      passwordHash: passwordEncrypt(
        this.dto.password,
        passwordEncryptionPublicKeyPath
      )
    });
  }
}

export class UpdateUserDtoMapper extends RequestDtoMapper<
  User,
  SchemaValidator
> {
  schema = UserSchemas.UpdateUserSchema;

  async toEntity(passwordEncryptionPublicKeyPath: string): Promise<User> {
    return User.update({
      ...this.dto,
      ...(this.dto.roleIds
        ? {
            roles: collection(
              await Promise.all(this.dto.roleIds.map((id) => Role.map({ id })))
            )
          }
        : {}),
      ...(passwordEncryptionPublicKeyPath && this.dto.password
        ? {
            passwordHash: passwordEncrypt(
              this.dto.password,
              passwordEncryptionPublicKeyPath
            )
          }
        : {})
    });
  }
}

export class UserDtoMapper extends ResponseDtoMapper<User, SchemaValidator> {
  schema = UserSchemas.UserSchema;

  async fromEntity(entity: User): Promise<this> {
    this.dto = {
      ...(await entity.read()),
      roles: entity.roles.isInitialized()
        ? await Promise.all(
            entity.roles
              .getItems()
              .map(async (role) =>
                (
                  await RoleDtoMapper.fromEntity(SchemaValidator(), role)
                ).toDto()
              )
          )
        : []
    };

    return this;
  }
}
