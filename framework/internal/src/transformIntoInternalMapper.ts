import { InstanceTypeRecord } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import { InternalMapper } from './types/internalMapper.types';

export function transformIntoInternalMapper<
  SchemaValidator extends AnySchemaValidator,
  Mapper extends Record<
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
  >
>(
  mappers: Mapper,
  schemaValidator: SchemaValidator
): InternalMapper<InstanceTypeRecord<Mapper>> {
  return Object.fromEntries(
    Object.entries(mappers).map(([key, value]) => [
      key,
      new value(schemaValidator)
    ])
  ) as unknown as InternalMapper<InstanceTypeRecord<Mapper>>;
}
