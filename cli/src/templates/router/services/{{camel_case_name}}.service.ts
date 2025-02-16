import { TtlCache } from '@forklaunch/core/cache';
import { EntityManager } from '@mikro-orm/core';
import { SchemaValidator } from '@{{app_name}}/core';
import { {{pascal_case_name}}Service } from '../interfaces/{{camel_case_name}}.interface';
import {
  {{pascal_case_name}}RequestDto,
  {{pascal_case_name}}RequestDtoMapper,
  {{pascal_case_name}}ResponseDto,
  {{pascal_case_name}}ResponseDtoMapper
} from '../models/dtoMapper/{{camel_case_name}}.dtoMapper';

// Base{{pascal_case_name}}Service class that implements the {{pascal_case_name}}Service interface
export class Base{{pascal_case_name}}Service implements {{pascal_case_name}}Service {
  constructor(private entityManager: EntityManager, private cache: TtlCache) {}

  // {{camel_case_name}}Post method that implements the {{pascal_case_name}}Service interface
  {{camel_case_name}}Post = async (
    dto: {{pascal_case_name}}RequestDto
  ): Promise<{{pascal_case_name}}ResponseDto> => {
    const entity = {{pascal_case_name}}RequestDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      dto
    );
    this.entityManager.persist(entity);
    return {{pascal_case_name}}ResponseDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      entity
    );
  };
}
