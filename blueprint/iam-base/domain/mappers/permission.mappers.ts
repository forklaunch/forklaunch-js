import { SchemaValidator } from '@forklaunch/blueprint-core';
import { RequestMapper, ResponseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Permission } from '../../persistence/entities/permission.entity';
import { PermissionSchemas } from '../../registrations';

export class CreatePermissionMapper extends RequestMapper<
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

export class UpdatePermissionMapper extends RequestMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.UpdatePermissionSchema;

  async toEntity(em: EntityManager): Promise<Permission> {
    return Permission.update(this.dto, em);
  }
}

export class PermissionMapper extends ResponseMapper<
  Permission,
  SchemaValidator
> {
  schema = PermissionSchemas.PermissionSchema;

  async fromEntity(entity: Permission): Promise<this> {
    this.dto = await entity.read();
    return this;
  }
}
