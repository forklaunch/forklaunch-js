export type InternalMapper<
  Mapper extends Record<
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
  [K in keyof Mapper]: Mapper[K] extends {
    dto: unknown;
    _Entity: unknown;
    serializeEntityToDto: unknown;
  }
    ? {
        serializeEntityToDto: Mapper[K]['serializeEntityToDto'];
      }
    : Mapper[K] extends {
          dto: unknown;
          _Entity: unknown;
          deserializeDtoToEntity: unknown;
        }
      ? {
          deserializeDtoToEntity: Mapper[K]['deserializeDtoToEntity'];
        }
      : never;
};
