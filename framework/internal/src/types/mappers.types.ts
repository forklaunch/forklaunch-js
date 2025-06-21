import { AnySchemaValidator, UnboxedObjectSchema } from '@forklaunch/validator';

/**
 * Type representing a schema validator object for an entity mapper.
 *
 * @template SV - A type that extends AnySchemaValidator.
 * @typedef {SV['_ValidSchemaObject'] | UnboxedObjectSchema<SV>} MapperSchemaValidatorObject
 */
export type MapperSchemaValidatorObject<SV extends AnySchemaValidator> =
  | SV['_ValidSchemaObject']
  | UnboxedObjectSchema<SV>;

/**
 * Type representing a response DTO mapper for an entity mapper.
 *
 * @template SchemaValidator - A type that extends AnySchemaValidator.
 * @template Dto - The type of the DTO object.
 * @template Entity - The type of the entity object.
 */
export type ResponseMapperConstructor<
  SchemaValidator extends AnySchemaValidator,
  Dto,
  Entity,
  SerializeEntityToDto extends (
    entity: Entity,
    ...additionalArgs: never[]
  ) => Promise<Dto> = (
    entity: Entity,
    ...additionalArgs: never[]
  ) => Promise<Dto>
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
export type RequestMapperConstructor<
  SchemaValidator extends AnySchemaValidator,
  Dto,
  Entity,
  DeserializeDtoToEntity extends (
    dto: Dto,
    ...additionalArgs: never[]
  ) => Promise<Entity> = (
    dto: Dto,
    ...additionalArgs: never[]
  ) => Promise<Entity>
> = new (schemaValidator: SchemaValidator) => {
  dto: Dto;
  _Entity: Entity;
  deserializeDtoToEntity: DeserializeDtoToEntity;
};
