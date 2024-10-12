import {
  RequestDtoMapper,
  ResponseDtoMapper
} from '@forklaunch/core/dtoMapper';
import { array, optional, SchemaValidator, string, uuid } from 'core';
import { Organization } from '../persistence/organization.entity';
import { UserDtoMapper } from './user.dtoMapper';

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

export class OrganizationDtoMapper extends ResponseDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = {
    id: uuid,
    name: string,
    users: array(UserDtoMapper.schema()),
    domain: string,
    subscription: string,
    status: string,
    logoUrl: optional(string)
  };

  fromEntity(entity: Organization): this {
    this.dto.id = entity.id;
    this.dto.name = entity.name;
    this.dto.users = entity.users.isInitialized()
      ? entity.users
          .getItems()
          .map((user) =>
            UserDtoMapper.fromEntity(SchemaValidator(), user).toJson()
          )
      : [];
    this.dto.domain = entity.domain;
    this.dto.subscription = entity.subscription;
    this.dto.status = entity.status;
    if (entity.logoUrl) {
      this.dto.logoUrl = entity.logoUrl;
    }

    return this;
  }
}
