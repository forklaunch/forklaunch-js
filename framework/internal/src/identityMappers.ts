import { AnySchemaValidator } from '@forklaunch/validator';

export class IdentityRequestMapper<
  T,
  SchemaValidator extends AnySchemaValidator
> {
  dto!: T;
  _Entity!: T;

  async deserializeDtoToEntity(
    schemaValidator: SchemaValidator,
    dto: T
  ): Promise<T> {
    return dto;
  }
}

export class IdentityResponseMapper<
  T,
  SchemaValidator extends AnySchemaValidator
> {
  dto!: T;
  _Entity!: T;

  async serializeEntityToDto(
    schemaValidator: SchemaValidator,
    entity: T
  ): Promise<T> {
    return entity;
  }
}
