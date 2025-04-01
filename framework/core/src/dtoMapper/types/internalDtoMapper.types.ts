import { ReturnTypeRecord } from '@forklaunch/common';

export type InternalDtoMapper<
  DtoMapper extends Record<
    string,
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
> = {
  [K in keyof DtoMapper]: DtoMapper[K] extends {
    dto: unknown;
    _Entity: unknown;
    serializeEntityToDto: unknown;
  }
    ? {
        serializeEntityToDto: (entity: Entities[K]) => Dto[K];
      }
    : DtoMapper[K] extends {
          dto: unknown;
          _Entity: unknown;
          deserializeDtoToEntity: unknown;
        }
      ? {
          deserializeDtoToEntity: (dto: Dto[K]) => Entities[K];
        }
      : never;
};

export function transformIntoInternalDtoMapper<
  DtoMapper extends Record<
    string,
    () =>
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
  dtoMappers: DtoMapper
): InternalDtoMapper<ReturnTypeRecord<DtoMapper>, Entities, Dto> {
  return Object.fromEntries(
    Object.entries(dtoMappers).map(([key, value]) => [key, value()])
  ) as unknown as InternalDtoMapper<ReturnTypeRecord<DtoMapper>, Entities, Dto>;
}
