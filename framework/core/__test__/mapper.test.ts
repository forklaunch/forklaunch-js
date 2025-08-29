/* eslint-disable @typescript-eslint/no-unused-vars */
import { Schema } from '@forklaunch/validator';
import { SchemaValidator, number, string } from '@forklaunch/validator/typebox';
import { PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { requestMapper, responseMapper } from '../src/mappers';
import { BaseEntity } from '../src/persistence';

const SV = SchemaValidator();

class TestEntity extends BaseEntity {
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

const TestSchema = {
  id: string,
  name: string,
  age: number
};

const TestRequestMapper = requestMapper(SV, TestSchema, TestEntity, {
  toEntity: async (dto, arg1: string, arg2?: string) => {
    const entity = new TestEntity();
    entity.id = dto.id;
    entity.name = dto.name;
    entity.age = dto.age;
    return entity;
  }
});

const TestResponseMapper = responseMapper(SV, TestSchema, TestEntity, {
  toDomain: async (entity, arg1: string, arg2?: string) => {
    return {
      id: entity.id,
      name: entity.name,
      age: entity.age
    };
  }
});

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
  let TestRequestDM: {
    schema: typeof TestSchema;
    toEntity: (
      dto: Schema<typeof TestSchema, typeof SV>,
      arg1: string,
      arg2?: string
    ) => Promise<TestEntity>;
    toDomain: (
      entity: TestEntity,
      arg1: string,
      arg2?: string
    ) => Promise<Schema<typeof TestSchema, typeof SV>>;
  };

  beforeAll(() => {
    TestRequestDM = {
      schema: TestSchema,
      toEntity: async (dto, arg1: string, arg2?: string) => {
        const entity = new TestEntity();
        entity.id = dto.id;
        entity.name = dto.name;
        entity.age = dto.age;
        return entity;
      },
      toDomain: async (entity, arg1: string, arg2?: string) => {
        return {
          id: entity.id,
          name: entity.name,
          age: entity.age
        };
      }
    };
  });
  test('schema static and constructed equality', async () => {
    expect(TestRequestDM.schema).toEqual(TestRequestMapper.schema);
  });

  test('deserialize', async () => {
    const json = {
      id: '123',
      name: 'test',
      age: 1
    };

    const entity = extractNonTimeBasedEntityFields(
      await TestRequestDM.toEntity(json, 'arg1')
    );
    // const objectEntity = extractNonTimeBasedEntityFields(
    //   await TestRequestDM.toEntity('arg1')
    // );
    const staticEntity = extractNonTimeBasedEntityFields(
      await TestRequestMapper.toEntity(json, 'arg1', 'arg2')
    );
    let expectedEntity = new TestEntity();
    expectedEntity.id = '123';
    expectedEntity.name = 'test';
    expectedEntity.age = 1;

    expectedEntity = extractNonTimeBasedEntityFields(expectedEntity);

    expect(entity).toEqual(expectedEntity);
    expect(staticEntity).toEqual(expectedEntity);
    expect(entity).toEqual(staticEntity);
    expect(staticEntity).toEqual(expectedEntity);
  });

  test('deserialize failure', async () => {
    const json = {
      id: '123',
      name: 'test'
    };

    await expect(
      async () =>
        await TestRequestMapper.toEntity(
          // @ts-expect-error - missing age
          json,
          'arg1'
        )
    ).rejects.toThrow();
  });
});

describe('response mappers tests', () => {
  let TestResponseDM: typeof TestResponseMapper;

  beforeAll(() => {
    TestResponseDM = {
      schema: {
        id: string,
        name: string,
        age: number
      },
      toDomain: async (entity, arg1: string, arg2?: string) => {
        return {
          id: entity.id,
          name: entity.name,
          age: entity.age
        };
      }
    };
  });

  test('schema static and constructed equality', async () => {
    expect(TestResponseDM.schema).toEqual(TestResponseMapper.schema);
  });

  test('serialize', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';
    entity.age = 1;

    const responseDM = await TestResponseDM.toDomain(entity, 'arg1');
    const staticDM = await TestResponseMapper.toDomain(entity, 'arg1');
    const expectedDto = {
      id: '123',
      name: 'test',
      age: 1
    };

    expect(staticDM).toEqual(expectedDto);
    expect(responseDM).toEqual(expectedDto);
    expect(responseDM).toEqual(staticDM);
  });

  test('serialize', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';
    entity.age = 1;

    const json = genericDtoWrapperFunction(
      await TestResponseDM.toDomain(entity, 'arg1')
    );
    const objectJson = genericDtoWrapperFunction(
      await TestResponseDM.toDomain(entity, 'arg1')
    );
    const staticJson = genericDtoWrapperFunction(
      await TestResponseMapper.toDomain(entity, 'arg1', 'arg2')
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

  test('serialize failure', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';

    await expect(
      async () => await TestResponseMapper.toDomain(entity, 'arg1', 'arg2')
    ).rejects.toThrow();
  });
});
