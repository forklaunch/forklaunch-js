import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestDtoMapper, ResponseDtoMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Permission } from '../../persistence/entities/permission.entity';
import { PermissionSchemas } from '../../registrations';

export class CreatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.CreatePermissionSchema;

  async toEntity(em: EntityManager): Promise<Permission> {
    return Permission.create(
      {
        ...this.dto,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      em
    );
  }
}

export class UpdatePermissionDtoMapper extends RequestDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.UpdatePermissionSchema;

  async toEntity(em: EntityManager): Promise<Permission> {
    return Permission.update(this.dto, em);
  }
}

export class PermissionDtoMapper extends ResponseDtoMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.PermissionSchema;

  async fromEntity(entity: Permission): Promise<this> {
    this.dto = await entity.read();
    return this;
  }
}
