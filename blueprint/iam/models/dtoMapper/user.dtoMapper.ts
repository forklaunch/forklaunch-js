import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  collection,
  date,
  email,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from '@forklaunch/framework-core';
import { passwordEncrypt } from '../../utils/passwordEncrypt';
import { Organization } from '../persistence/organization.entity';
import { Role } from '../persistence/role.entity';
import { User } from '../persistence/user.entity';
import { RoleDtoMapper } from './role.dtoMapper';

export type CreateUserDto = CreateUserDtoMapper['dto'];
export class CreateUserDtoMapper extends RequestDtoMapper<
  User,
  SchemaValidator
> {
  schema = {
    email: email,
    password: string,
    firstName: string,
    lastName: string,
    organizationId: string,
    roleIds: array(string),
    phoneNumber: optional(string),
    subscription: optional(string),
    extraFields: optional(string)
  };

  toEntity(
    passwordEncryptionPublicKeyPath: string,
    roles: Role[],
    organization?: Organization
  ): User {
    return User.create({
      ...this.dto,
      organization,
      roles: collection(roles),
      passwordHash: passwordEncrypt(
        this.dto.password,
        passwordEncryptionPublicKeyPath
      )
    });
  }
}

export type UpdateUserDto = UpdateUserDtoMapper['dto'];
export class UpdateUserDtoMapper extends RequestDtoMapper<
  User,
  SchemaValidator
> {
  schema = {
    id: uuid,
    email: optional(email),
    password: optional(string),
    firstName: optional(string),
    lastName: optional(string),
    roleIds: optional(array(string)),
    phoneNumber: optional(string),
    subscription: optional(string),
    extraFields: optional(string)
  };

  toEntity(
    passwordEncryptionPublicKeyPath: string,
    roles: Role[],
    organization?: Organization
  ): User {
    return User.update({
      ...this.dto,
      ...(organization ? { organization } : {}),
      ...(roles ? { roles: collection(roles) } : {}),
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

const userSchema = {
  id: uuid,
  email: email,
  firstName: string,
  lastName: string,
  roles: array(RoleDtoMapper.schema()),
  phoneNumber: optional(string),
  subscription: optional(string),
  extraFields: optional(unknown),
  createdAt: date,
  updatedAt: date
};

export type UserDto = UserDtoMapper['dto'];
export class UserDtoMapper extends ResponseDtoMapper<User, SchemaValidator> {
  schema = userSchema;

  fromEntity(entity: User): this {
    this.dto = {
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      roles: entity.roles.isInitialized()
        ? entity.roles
            .getItems()
            .map((role) =>
              RoleDtoMapper.fromEntity(SchemaValidator(), role).toDto()
            )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    if (entity.phoneNumber) {
      this.dto.phoneNumber = entity.phoneNumber;
    }
    if (entity.subscription) {
      this.dto.subscription = entity.subscription;
    }
    if (entity.extraFields) {
      this.dto.extraFields = entity.extraFields;
    }
    return this;
  }
}

export class UserEntityMapper extends RequestDtoMapper<User, SchemaValidator> {
  schema = userSchema;

  toEntity(): User {
    const user = User.map({
      ...this.dto,
      ...(this.dto.roles
        ? { roles: this.dto.roles.map((role) => role.id) }
        : {})
      // ...(this.dto.roles
      //   ? {
      //       roles: new Collection(
      //         this.dto.roles.map((role) =>
      //           RoleEntityMapper.deserializeDtoToEntity(
      //             this.schemaValidator as SchemaValidator,
      //             role
      //           )
      //         )
      //       )
      //     }
      //   : {})
    });

    return user;
  }
}
