import { AnySchemaValidator, UnboxedObjectSchema } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

/**
 * Type representing a schema validator object for an entity mapper.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @typedef {SV['_ValidSchemaObject'] | UnboxedObjectSchema<SV>} DtoMapperSchemaValidatorObject
 */
export type DtoMapperSchemaValidatorObject<SV extends AnySchemaValidator> =
  | SV['_ValidSchemaObject']
  | UnboxedObjectSchema<SV>;

/**
 * Type representing a response DTO mapper for an entity mapper.
 *
 * @template SchemaValidator - A type that extends AnySchemaValidator.
 * @template Dto - The type of the DTO object.
 * @template Entity - The type of the entity object.
 */
export type ResponseDtoMapperConstructor<
  SchemaValidator extends AnySchemaValidator,
  Dto,
  Entity,
  SerializeEntityToDto = unknown
> = new (schemaValidator: SchemaValidator) => {
  dto: Dto;
  _Entity: Entity;
  serializeEntityToDto: SerializeEntityToDto;
};

/**
 * Type representing a request DTO mapper for an entity mapper.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @template Dto - The type of the DTO object.
 * @template Entity - The type of the entity object.
 */
export type RequestDtoMapperConstructor<
  SchemaValidator extends AnySchemaValidator,
  Dto,
  Entity,
  DeserializeDtoToEntity = unknown
> = new (
  schemaValidator: SchemaValidator,
  em: EntityManager
) => {
  dto: Dto;
  _Entity: Entity;
  deserializeDtoToEntity: DeserializeDtoToEntity;
};
