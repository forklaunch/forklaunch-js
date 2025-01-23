import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  array,
  date,
  enum_,
  optional,
  SchemaValidator,
  string,
  uuid
} from '@forklaunch/framework-core';
import { Collection } from '@mikro-orm/core';
import {
  Organization,
  OrganizationStatus
} from '../persistence/organization.entity';
import { User } from '../persistence/user.entity';
import { UserDtoMapper, UserEntityMapper } from './user.dtoMapper';

export type CreateOrganizationDto = CreateOrganizationDtoMapper['dto'];
export class CreateOrganizationDtoMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = {
    name: string,
    domain: string,
    subscription: string,
    logoUrl: optional(string)
  };

  toEntity() {
    return Organization.create({
      ...this.dto,
      users: new Collection<User>([]),
      status: OrganizationStatus.ACTIVE
    });
  }
}

export type UpdateOrganizationDto = UpdateOrganizationDtoMapper['dto'];
export class UpdateOrganizationDtoMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = {
    id: uuid,
    name: optional(string),
    domain: optional(string),
    subscription: optional(string),
    logoUrl: optional(string)
  };

  toEntity(): Organization {
    return Organization.update(this.dto);
  }
}

const organizationSchema = {
  id: uuid,
  name: string,
  users: array(UserDtoMapper.schema()),
  domain: string,
  subscription: string,
  status: enum_(OrganizationStatus),
  logoUrl: optional(string),
  createdAt: date,
  updatedAt: date
};

export type OrganizationDto = OrganizationDtoMapper['dto'];
export class OrganizationDtoMapper extends ResponseDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = organizationSchema;

  fromEntity(entity: Organization): this {
    this.dto = {
      ...entity.read(),
      users: entity.users.isInitialized()
        ? entity.users
            .getItems()
            .map((user) =>
              UserDtoMapper.fromEntity(SchemaValidator(), user).toDto()
            )
        : []
    };

    return this;
  }
}

export class OrganizationEntityMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = organizationSchema;

  toEntity(): Organization {
    return Organization.create({
      ...this.dto,
      ...(this.dto.users
        ? {
            users: new Collection(
              this.dto.users.map((user) =>
                UserEntityMapper.deserializeDtoToEntity(
                  this.schemaValidator as SchemaValidator,
                  user
                )
              )
            )
          }
        : {})
    });
  }
}
