import { InstanceTypeRecord } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { InternalDtoMapper } from './types/internalDtoMapper.types';

export function transformIntoInternalDtoMapper<
  SchemaValidator extends AnySchemaValidator,
  DtoMapper extends Record<
    string,
    new (schemaValidator: SchemaValidator) =>
      | {
          dto: unknown;
          _Entity: unknown;
          serializeEntityToDto: unknown;
        }
      | {
          dto: unknown;
          _Entity: unknown;
          deserializeDtoToEntity: unknown;
        }
  >,
  Entities extends Record<keyof DtoMapper, unknown>,
  Dto extends Record<keyof DtoMapper, unknown>
>(
  dtoMappers: DtoMapper,
  schemaValidator: SchemaValidator
): InternalDtoMapper<InstanceTypeRecord<DtoMapper>, Entities, Dto> {
  return Object.fromEntries(
    Object.entries(dtoMappers).map(([key, value]) => [
      key,
      new value(schemaValidator)
    ])
  ) as unknown as InternalDtoMapper<
    InstanceTypeRecord<DtoMapper>,
    Entities,
    Dto
  >;
}
