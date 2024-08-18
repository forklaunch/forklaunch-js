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

describe('request dtoMapper tests', () => {
  let TestRequestDM: TestRequestDtoMapper;

  beforeAll(() => {
    TestRequestDM = new TestRequestDtoMapper(SchemaValidator());
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

    const responseDM = TestRequestDM.fromJson(json);
    const staticDM = TestRequestDtoMapper.fromJson(SchemaValidator(), json);
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
      TestRequestDM.deserializeJsonToEntity(json)
    );
    const objectEntity = extractNonTimeBasedEntityFields(
      TestRequestDM.fromJson(json).toEntity()
    );
    const staticEntity = extractNonTimeBasedEntityFields(
      TestRequestDtoMapper.deserializeJsonToEntity(SchemaValidator(), json)
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
    expect(() => TestRequestDM.fromJson(json)).toThrow();
    expect(() =>
      // @ts-expect-error
      TestRequestDtoMapper.fromJson(new TypeboxSchemaValidator(), json)
    ).toThrow();
  });
});

describe('response dtoMapper tests', () => {
  let TestResponseDM: TestResponseDtoMapper;

  beforeAll(() => {
    TestResponseDM = new TestResponseDtoMapper(SchemaValidator());
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
    const staticDM = TestResponseDtoMapper.fromEntity(
      SchemaValidator(),
      entity
    );
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

    const json = TestResponseDM.serializeEntityToJson(entity);
    const objectJson = TestResponseDM.fromEntity(entity).toJson();
    const staticJson = TestResponseDtoMapper.serializeEntityToJson(
      SchemaValidator(),
      entity
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

    expect(() => TestResponseDM.fromEntity(entity).toJson()).toThrow();
    expect(() =>
      TestResponseDtoMapper.fromEntity(SchemaValidator(), entity).toJson()
    ).toThrow();
  });
});
