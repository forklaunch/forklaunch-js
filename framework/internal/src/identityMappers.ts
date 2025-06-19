import { AnySchemaValidator } from '@forklaunch/validator';

export class IdentityRequestMapper<
  T,
  SchemaValidator extends AnySchemaValidator
> {
  dto!: T;
  _Entity!: T;

  deserializeDtoToEntity(schemaValidator: SchemaValidator, dto: T): T {
    return dto;
  }
}

export class IdentityResponseMapper<
  T,
  SchemaValidator extends AnySchemaValidator
> {
  dto!: T;
  _Entity!: T;

  serializeEntityToDto(schemaValidator: SchemaValidator, entity: T): T {
    return entity;
  }
}
