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
    const organization = new Organization();
    organization.name = this.dto.name;
    organization.domain = this.dto.domain;
    organization.subscription = this.dto.subscription;
    if (this.dto.logoUrl) {
      organization.logoUrl = this.dto.logoUrl;
    }

    return organization;
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
    const organization = new Organization();
    organization.id = this.dto.id;
    if (this.dto.name) {
      organization.name = this.dto.name;
    }
    if (this.dto.domain) {
      organization.domain = this.dto.domain;
    }
    if (this.dto.subscription) {
      organization.subscription = this.dto.subscription;
    }
    if (this.dto.logoUrl) {
      organization.logoUrl = this.dto.logoUrl;
    }

    return organization;
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
      id: entity.id,
      name: entity.name,
      users: entity.users.isInitialized()
        ? entity.users
            .getItems()
            .map((user) =>
              UserDtoMapper.fromEntity(SchemaValidator(), user).toDto()
            )
        : [],
      domain: entity.domain,
      subscription: entity.subscription,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    if (entity.logoUrl) {
      this.dto.logoUrl = entity.logoUrl;
    }

    return this;
  }
}

export class OrganizationEntityMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = organizationSchema;

  toEntity(): Organization {
    const organization = new Organization();
    organization.id = this.dto.id;
    organization.name = this.dto.name;
    organization.users = new Collection(
      organization,
      this.dto.users.map((user) =>
        UserEntityMapper.deserializeDtoToEntity(
          this.schemaValidator as SchemaValidator,
          user
        )
      )
    );
    organization.domain = this.dto.domain;
    organization.subscription = this.dto.subscription;
    organization.status = this.dto.status;
    if (this.dto.logoUrl) {
      organization.logoUrl = this.dto.logoUrl;
    }
    organization.createdAt = this.dto.createdAt;
    organization.updatedAt = this.dto.updatedAt;

    return organization;
  }
}
