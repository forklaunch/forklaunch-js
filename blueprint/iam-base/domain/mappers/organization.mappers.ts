import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Organization } from '../../persistence/entities/organization.entity';
import { OrganizationSchemas } from '../../registrations';
import { OrganizationStatus } from '../enum/organizationStatus.enum';
import { UserMapper } from './user.mappers';

export class CreateOrganizationMapper extends RequestMapper<
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

export class UpdateOrganizationMapper extends RequestMapper<
  Organization,
  SchemaValidator
> {
  schema = OrganizationSchemas.UpdateOrganizationSchema;

  async toEntity(em: EntityManager): Promise<Organization> {
    return Organization.update(this.dto, em);
  }
}
export class OrganizationMapper extends ResponseMapper<
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
            await UserMapper.fromEntity(
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
