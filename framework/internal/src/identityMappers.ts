export class IdentityRequestMapper<T> {
  dto!: T;
  _Entity!: T;

  async deserializeDtoToEntity(dto: T): Promise<T> {
    return dto;
  }
}

export class IdentityResponseMapper<T> {
  dto!: T;
  _Entity!: T;

  async serializeEntityToDto(entity: T): Promise<T> {
    return entity;
  }
}
