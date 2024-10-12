import { Collection } from '@mikro-orm/core';

import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  email,
  optional,
  SchemaValidator,
  string,
  unknown,
  uuid
} from 'core';
import passwordEncrypt from '../../utils/passwordEncrypt';
import { Role } from '../persistence/role.entity';
import { User } from '../persistence/user.entity';
import { RoleDtoMapper } from './role.dtoMapper';

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

  toEntity(roles: Role[]): User {
    const user = new User();
    user.email = this.dto.email;
    user.passwordHash = passwordEncrypt(this.dto.password);
    user.firstName = this.dto.firstName;
    user.lastName = this.dto.lastName;
    user.roles = new Collection(user, roles);
    if (this.dto.phoneNumber) {
      user.phoneNumber = this.dto.phoneNumber;
    }
    if (this.dto.subscription) {
      user.subscription = this.dto.subscription;
    }
    if (this.dto.extraFields) {
      user.extraFields = this.dto.extraFields;
    }

    return user;
  }
}

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

  toEntity(roles: Role[]): User {
    const user = new User();
    user.id = this.dto.id;
    if (this.dto.email) {
      user.email = this.dto.email;
    }
    if (this.dto.password) {
      user.passwordHash = passwordEncrypt(this.dto.password);
    }
    if (this.dto.firstName) {
      user.firstName = this.dto.firstName;
    }
    if (this.dto.lastName) {
      user.lastName = this.dto.lastName;
    }
    if (this.dto.roleIds) {
      user.roles = new Collection(user, roles);
    }
    if (this.dto.phoneNumber) {
      user.phoneNumber = this.dto.phoneNumber;
    }
    if (this.dto.subscription) {
      user.subscription = this.dto.subscription;
    }
    if (this.dto.extraFields) {
      user.extraFields = this.dto.extraFields;
    }

    return user;
  }
}

export class UserDtoMapper extends ResponseDtoMapper<User, SchemaValidator> {
  schema = {
    id: uuid,
    email: email,
    firstName: string,
    lastName: string,
    roles: array(RoleDtoMapper.schema()),
    phoneNumber: optional(string),
    subscription: optional(string),
    extraFields: optional(unknown)
  };

  fromEntity(entity: User): this {
    this.dto.id = entity.id;
    this.dto.email = entity.email;
    this.dto.firstName = entity.firstName;
    this.dto.lastName = entity.lastName;
    this.dto.roles = entity.roles.isInitialized()
      ? entity.roles
          .getItems()
          .map((role) =>
            RoleDtoMapper.fromEntity(SchemaValidator(), role).toJson()
          )
      : [];
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