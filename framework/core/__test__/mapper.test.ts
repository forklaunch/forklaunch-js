/* eslint-disable @typescript-eslint/no-unused-vars */
import { SchemaValidator, number, string } from '@forklaunch/validator/typebox';
import { PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { RequestDtoMapper } from '../src/mappers/models/requestDtoMapper.model';
import { ResponseDtoMapper } from '../src/mappers/models/responseDtoMapper.model';

const SV = SchemaValidator();

type TypeboxSchemaValidator = typeof SV;

class TestEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

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

  toEntity(arg1: string, arg2?: string): TestEntity {
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

  fromEntity(entity: TestEntity, arg1: string, arg2?: string): this {
    this.dto = {
      id: entity.id,
      name: entity.name,
      age: entity.age
    };

    return this;
  }
}

function extractNonTimeBasedEntityFields<
  T extends {
    createdAt: Date;
    updatedAt: Date;
  }
>(entity: T): T {
  entity.createdAt = new Date(0);
  entity.updatedAt = new Date(0);
  return entity;
}

function genericDtoWrapperFunction<T>(dto: T): T {
  return dto;
}

describe('request mappers tests', () => {
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
      TestRequestDM.deserializeDtoToEntity(json, 'arg1')
    );
    const objectEntity = extractNonTimeBasedEntityFields(
      TestRequestDM.fromDto(json).toEntity('arg1')
    );
    const staticEntity = extractNonTimeBasedEntityFields(
      TestRequestDtoMapper.deserializeDtoToEntity(SV, json, 'arg1', 'arg2')
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

    // @ts-expect-error - missing age
    expect(() => TestRequestDM.fromDto(json)).toThrow();
    // @ts-expect-error - missing age
    expect(() => TestRequestDtoMapper.fromDto(SV, json)).toThrow();
  });
});

describe('response mappers tests', () => {
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

    const responseDM = TestResponseDM.fromEntity(entity, 'arg1');
    const staticDM = TestResponseDtoMapper.fromEntity(SV, entity, 'arg1');
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
      TestResponseDM.serializeEntityToDto(entity, 'arg1')
    );
    const objectJson = genericDtoWrapperFunction(
      TestResponseDM.fromEntity(entity, 'arg1').toDto()
    );
    const staticJson = genericDtoWrapperFunction(
      TestResponseDtoMapper.serializeEntityToDto(SV, entity, 'arg1', 'arg2')
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

    expect(() => TestResponseDM.fromEntity(entity, 'arg1').toDto()).toThrow();
    expect(() =>
      TestResponseDtoMapper.fromEntity(SV, entity, 'arg1', 'arg2').toDto()
    ).toThrow();
  });
});
