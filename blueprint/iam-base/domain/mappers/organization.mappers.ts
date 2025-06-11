import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { OrganizationSchemas } from '../../registrations';
import { OrganizationStatus } from '../enum/organizationStatus.enum';
import { UserDtoMapper } from './user.mappers';

export class CreateOrganizationDtoMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = OrganizationSchemas.CreateOrganizationSchema;

  async toEntity(em: EntityManager): Promise<Organization> {
    return Organization.create(
      {
        ...this.dto,
        users: [],
        status: OrganizationStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdateOrganizationDtoMapper extends RequestDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = OrganizationSchemas.UpdateOrganizationSchema;

  async toEntity(em: EntityManager): Promise<Organization> {
    return Organization.update(this.dto, em);
  }
}
export class OrganizationDtoMapper extends ResponseDtoMapper<
  Organization,
  SchemaValidator
> {
  schema = OrganizationSchemas.OrganizationSchema(OrganizationStatus);

  async fromEntity(entity: Organization): Promise<this> {
    this.dto = {
      ...(await entity.read()),
      users: await Promise.all(
        entity.users.map(async (user) =>
          (
            await UserDtoMapper.fromEntity(
              this.schemaValidator as SchemaValidator,
              user
            )
          ).toDto()
        )
      )
    };
    return this;
  }
}
