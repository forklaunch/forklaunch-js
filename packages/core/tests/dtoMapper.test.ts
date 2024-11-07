import { SchemaValidator, number, string } from '@forklaunch/validator/typebox';
import { Property } from '@mikro-orm/core';
import { BaseEntity } from '../src/database/mikro/models/entities/base.entity';
import { RequestDtoMapper } from '../src/dtoMapper/models/requestDtoMapper.model';
import { ResponseDtoMapper } from '../src/dtoMapper/models/responseDtoMapper.model';

const SV = SchemaValidator();

type TypeboxSchemaValidator = typeof SV;

class TestEntity extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  age!: number;
}

class TestRequestDtoMapper extends RequestDtoMapper<
  TestEntity,
  TypeboxSchemaValidator
> {
  schema = {
    id: string,
    name: string,
    age: number
  };

  toEntity(...additionalArgs: unknown[]): TestEntity {
    const entity = new TestEntity();
    entity.id = this.dto.id;
    entity.name = this.dto.name;
    entity.age = this.dto.age;

    return entity;
  }
}

class TestResponseDtoMapper extends ResponseDtoMapper<
  TestEntity,
  TypeboxSchemaValidator
> {
  schema = {
    id: string,
    name: string,
    age: number
  };

  fromEntity(entity: TestEntity): this {
    this.dto = {
      id: entity.id,
      name: entity.name,
      age: entity.age
    };

    return this;
  }
}

function extractNonTimeBasedEntityFields<T extends BaseEntity>(entity: T): T {
  entity.createdAt = new Date(0);
  entity.updatedAt = new Date(0);
  return entity;
}

function genericDtoWrapperFunction<T>(dto: T): T {
  return dto;
}

describe('request dtoMapper tests', () => {
  let TestRequestDM: TestRequestDtoMapper;

  beforeAll(() => {
    TestRequestDM = new TestRequestDtoMapper(SV);
  });

  test('schema static and constructed equality', async () => {
    expect(TestRequestDM.schema).toEqual(TestRequestDtoMapper.schema());
  });

  test('from JSON', async () => {
    const json = {
      id: '123',
      name: 'test',
      age: 1
    };

    const responseDM = TestRequestDM.fromDto(json);
    const staticDM = TestRequestDtoMapper.fromDto(SV, json);
    const expectedDto = {
      id: '123',
      name: 'test',
      age: 1
    };

    expect(staticDM.dto).toEqual(expectedDto);
    expect(responseDM.dto).toEqual(expectedDto);
    expect(responseDM.dto).toEqual(staticDM.dto);
  });

  test('deserialize', async () => {
    const json = {
      id: '123',
      name: 'test',
      age: 1
    };

    const entity = extractNonTimeBasedEntityFields(
      TestRequestDM.deserializeDtoToEntity(json)
    );
    const objectEntity = extractNonTimeBasedEntityFields(
      TestRequestDM.fromDto(json).toEntity()
    );
    const e = TestRequestDtoMapper.deserializeDtoToEntity(SV, json);
    const staticEntity = extractNonTimeBasedEntityFields(
      TestRequestDtoMapper.deserializeDtoToEntity(SV, json)
    );
    let expectedEntity = new TestEntity();
    expectedEntity.id = '123';
    expectedEntity.name = 'test';
    expectedEntity.age = 1;

    expectedEntity = extractNonTimeBasedEntityFields(expectedEntity);

    expect(entity).toEqual(expectedEntity);
    expect(objectEntity).toEqual(expectedEntity);
    expect(staticEntity).toEqual(expectedEntity);
    expect(entity).toEqual(objectEntity);
    expect(entity).toEqual(staticEntity);
    expect(staticEntity).toEqual(expectedEntity);
    expect(staticEntity).toEqual(objectEntity);
  });

  test('serialize failure', async () => {
    const json = {
      id: '123',
      name: 'test'
    };

    // @ts-expect-error
    expect(() => TestRequestDM.fromDto(json)).toThrow();
    // @ts-expect-error
    expect(() => TestRequestDtoMapper.fromDto(SV, json)).toThrow();
  });
});

describe('response dtoMapper tests', () => {
  let TestResponseDM: TestResponseDtoMapper;

  beforeAll(() => {
    TestResponseDM = new TestResponseDtoMapper(SV);
  });

  test('schema static and constructed equality', async () => {
    expect(TestResponseDM.schema).toEqual(TestResponseDtoMapper.schema());
  });

  test('from entity', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';
    entity.age = 1;

    const responseDM = TestResponseDM.fromEntity(entity);
    const staticDM = TestResponseDtoMapper.fromEntity(SV, entity);
    const expectedDto = {
      id: '123',
      name: 'test',
      age: 1
    };

    expect(staticDM.dto).toEqual(expectedDto);
    expect(responseDM.dto).toEqual(expectedDto);
    expect(responseDM.dto).toEqual(staticDM.dto);
  });

  test('serialize', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';
    entity.age = 1;

    const json = genericDtoWrapperFunction(
      TestResponseDM.serializeEntityToDto(entity)
    );
    const objectJson = genericDtoWrapperFunction(
      TestResponseDM.fromEntity(entity).toDto()
    );
    const staticJson = genericDtoWrapperFunction(
      TestResponseDtoMapper.serializeEntityToDto(SV, entity)
    );
    const expectedJson = {
      id: '123',
      name: 'test',
      age: 1
    };

    expect(json).toEqual(expectedJson);
    expect(objectJson).toEqual(expectedJson);
    expect(staticJson).toEqual(expectedJson);
    expect(json).toEqual(objectJson);
    expect(json).toEqual(staticJson);
    expect(staticJson).toEqual(expectedJson);
    expect(staticJson).toEqual(objectJson);
  });

  test('deserialize failure', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';

    expect(() => TestResponseDM.fromEntity(entity).toDto()).toThrow();
    expect(() =>
      TestResponseDtoMapper.fromEntity(SV, entity).toDto()
    ).toThrow();
  });
});
