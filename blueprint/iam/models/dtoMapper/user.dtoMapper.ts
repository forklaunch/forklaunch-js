import { collection, SchemaValidator } from '@forklaunch/blueprint-core';
import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { UserSchemas } from '../../registrations';
import { passwordEncrypt } from '../../utils/passwordEncrypt';
import { Organization } from '../persistence/organization.entity';
import { Role } from '../persistence/role.entity';
import { User } from '../persistence/user.entity';
import { RoleDtoMapper } from './role.dtoMapper';

export class CreateUserDtoMapper extends RequestDtoMapper<
  User,
  SchemaValidator
> {
  schema = UserSchemas.CreateUserSchema;

  toEntity(passwordEncryptionPublicKeyPath: string): User {
    return User.create({
      ...this.dto,
      organization: Organization.map({
        id: this.dto.organizationId
      }),
      roles: collection(this.dto.roleIds.map((id) => Role.map({ id }))),
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

  toEntity(passwordEncryptionPublicKeyPath: string): User {
    return User.update({
      ...this.dto,
      ...(this.dto.roleIds
        ? { roles: collection(this.dto.roleIds.map((id) => Role.map({ id }))) }
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

  fromEntity(entity: User): this {
    this.dto = {
      ...entity.read(),
      roles: entity.roles.isInitialized()
        ? entity.roles
            .getItems()
            .map((role) =>
              RoleDtoMapper.fromEntity(SchemaValidator(), role).toDto()
            )
        : []
    };

    return this;
  }
}
