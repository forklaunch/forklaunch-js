import {
  TypeboxSchemaValidator,
  number,
  string
} from '@forklaunch/validator/typebox';
import { Property } from '@mikro-orm/core';
import { BaseEntity } from '../database/mikro/models/entities/base.entity';
import { RequestEntityMapper } from '../entityMapper/models/requestEntityMapper.model';
import { ResponseEntityMapper } from '../entityMapper/models/responseEntityMapper.model';

class TestEntity extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  age!: number;
}

class TestRequestEntityMapper extends RequestEntityMapper<
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

class TestResponseEntityMapper extends ResponseEntityMapper<
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

describe('Request Entity Mapper Test', () => {
  let TestRequestEM: TestRequestEntityMapper;

  beforeAll(() => {
    TestRequestEM = new TestRequestEntityMapper(new TypeboxSchemaValidator());
  });

  test('Schema Equality', async () => {
    expect(TestRequestEM.schema).toEqual(TestRequestEntityMapper.schema());
  });

  test('From JSON', async () => {
    const json = {
      id: '123',
      name: 'test',
      age: 1
    };

    const responseEM = TestRequestEM.fromJson(json);
    const staticEM = TestRequestEntityMapper.fromJson(
      new TypeboxSchemaValidator(),
      json
    );
    const expectedDto = {
      id: '123',
      name: 'test',
      age: 1
    };

    expect(staticEM.dto).toEqual(expectedDto);
    expect(responseEM.dto).toEqual(expectedDto);
    expect(responseEM.dto).toEqual(staticEM.dto);
  });

  test('Deserialization Equality', async () => {
    const json = {
      id: '123',
      name: 'test',
      age: 1
    };

    const entity = extractNonTimeBasedEntityFields(
      TestRequestEM.deserializeJsonToEntity(json)
    );
    const objectEntity = extractNonTimeBasedEntityFields(
      TestRequestEM.fromJson(json).toEntity()
    );
    const staticEntity = extractNonTimeBasedEntityFields(
      TestRequestEntityMapper.deserializeJsonToEntity(
        new TypeboxSchemaValidator(),
        json
      )
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

  test('Serialization Failure', async () => {
    const json = {
      id: '123',
      name: 'test'
    };

    // @ts-expect-error
    expect(() => TestRequestEM.fromJson(json)).toThrow();
    expect(() =>
      // @ts-expect-error
      TestRequestEntityMapper.fromJson(new TypeboxSchemaValidator(), json)
    ).toThrow();
  });
});

describe('Response Entity Mapper Test', () => {
  let TestResponseEM: TestResponseEntityMapper;

  beforeAll(() => {
    TestResponseEM = new TestResponseEntityMapper(new TypeboxSchemaValidator());
  });

  test('Schema Equality', async () => {
    expect(TestResponseEM.schema).toEqual(TestResponseEntityMapper.schema());
  });

  test('From Entity', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';
    entity.age = 1;

    const responseEM = TestResponseEM.fromEntity(entity);
    const staticEM = TestResponseEntityMapper.fromEntity(
      new TypeboxSchemaValidator(),
      entity
    );
    const expectedDto = {
      id: '123',
      name: 'test',
      age: 1
    };

    expect(staticEM.dto).toEqual(expectedDto);
    expect(responseEM.dto).toEqual(expectedDto);
    expect(responseEM.dto).toEqual(staticEM.dto);
  });

  test('Serialization Equality', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';
    entity.age = 1;

    const json = TestResponseEM.serializeEntityToJson(entity);
    const objectJson = TestResponseEM.fromEntity(entity).toJson();
    const staticJson = TestResponseEntityMapper.serializeEntityToJson(
      new TypeboxSchemaValidator(),
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

  test('Serialization Failure', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';

    expect(() => TestResponseEM.fromEntity(entity).toJson()).toThrow();
    expect(() =>
      TestResponseEntityMapper.fromEntity(
        new TypeboxSchemaValidator(),
        entity
      ).toJson()
    ).toThrow();
  });
});
