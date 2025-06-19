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
  >
> = {
  [K in keyof DtoMapper]: DtoMapper[K] extends {
    dto: unknown;
    _Entity: unknown;
    serializeEntityToDto: unknown;
  }
    ? {
        serializeEntityToDto: DtoMapper[K]['serializeEntityToDto'];
      }
    : DtoMapper[K] extends {
          dto: unknown;
          _Entity: unknown;
          deserializeDtoToEntity: unknown;
        }
      ? {
          deserializeDtoToEntity: DtoMapper[K]['deserializeDtoToEntity'];
        }
      : never;
};
