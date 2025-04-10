type AllAfterFirstParameters<T> = T extends (
  first: never,
  ...args: infer U
) => unknown
  ? U
  : never[];

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
        serializeEntityToDto: (
          entity: Entities[K],
          ...additionalArgs: AllAfterFirstParameters<
            DtoMapper[K]['serializeEntityToDto']
          >
        ) => Dto[K];
      }
    : DtoMapper[K] extends {
          dto: unknown;
          _Entity: unknown;
          deserializeDtoToEntity: unknown;
        }
      ? {
          deserializeDtoToEntity: (
            dto: Dto[K],
            ...additionalArgs: AllAfterFirstParameters<
              DtoMapper[K]['deserializeDtoToEntity']
            >
          ) => Entities[K];
        }
      : never;
};
