/* eslint-disable @typescript-eslint/no-unused-vars */
import { SchemaValidator, number, string } from '@forklaunch/validator/typebox';
import { PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { mapper } from '../src/mappers';
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

const TestMapper = mapper(
  SV,
  {
    id: string,
    name: string,
    age: number
  },
  TestEntity,
  {
    toEntity: async (dto, arg1: string, arg2?: string) => {
      const entity = new TestEntity();
      entity.id = dto.id;
      entity.name = dto.name;
      entity.age = dto.age;
      return entity;
    },
    toDto: async (entity, arg1: string, arg2?: string) => {
      return {
        id: entity.id,
        name: entity.name,
        age: entity.age
      };
    }
  }
);

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
  let TestRequestDM: typeof TestMapper;

  beforeAll(() => {
    TestRequestDM = {
      schema: {
        id: string,
        name: string,
        age: number
      },
      toEntity: async (dto, arg1: string, arg2?: string) => {
        const entity = new TestEntity();
        entity.id = dto.id;
        entity.name = dto.name;
        entity.age = dto.age;
        return entity;
      },
      toDto: async (entity, arg1: string, arg2?: string) => {
        return {
          id: entity.id,
          name: entity.name,
          age: entity.age
        };
      }
    };
  });
  test('schema static and constructed equality', async () => {
    expect(TestRequestDM.schema).toEqual(TestMapper.schema);
  });

  test('from JSON', async () => {
    const json = {
      id: '123',
      name: 'test',
      age: 1
    };

    const responseDM = await TestRequestDM.toDto(
      await TestRequestDM.toEntity(json, 'arg1'),
      'arg1'
    );
    const staticDM = await TestMapper.toDto(
      await TestMapper.toEntity(json, 'arg1'),
      'arg1'
    );

    const expectedDto = {
      id: '123',
      name: 'test',
      age: 1
    };

    expect(staticDM).toEqual(expectedDto);
    expect(responseDM).toEqual(expectedDto);
    expect(responseDM).toEqual(staticDM);
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
      await TestMapper.toEntity(json, 'arg1', 'arg2')
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

  test('serialize failure', async () => {
    const json = {
      id: '123',
      name: 'test'
    };

    await expect(
      async () =>
        await TestMapper.toEntity(
          // @ts-expect-error - missing age
          json,
          'arg1'
        )
    ).rejects.toThrow();
  });
});

describe('response mappers tests', () => {
  let TestResponseDM: typeof TestMapper;

  beforeAll(() => {
    TestResponseDM = {
      schema: {
        id: string,
        name: string,
        age: number
      },
      toDto: async (entity, arg1: string, arg2?: string) => {
        return {
          id: entity.id,
          name: entity.name,
          age: entity.age
        };
      },
      toEntity: async (dto, arg1: string, arg2?: string) => {
        const entity = new TestEntity();
        entity.id = dto.id;
        entity.name = dto.name;
        entity.age = dto.age;
        return entity;
      }
    };
  });

  test('schema static and constructed equality', async () => {
    expect(TestResponseDM.schema).toEqual(TestMapper.schema);
  });

  test('from entity', async () => {
    const entity = new TestEntity();
    entity.id = '123';
    entity.name = 'test';
    entity.age = 1;

    const responseDM = await TestResponseDM.toDto(entity, 'arg1');
    const staticDM = await TestMapper.toDto(entity, 'arg1');
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
      await TestResponseDM.toDto(entity, 'arg1')
    );
    const objectJson = genericDtoWrapperFunction(
      await TestResponseDM.toDto(entity, 'arg1')
    );
    const staticJson = genericDtoWrapperFunction(
      await TestMapper.toDto(entity, 'arg1', 'arg2')
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

    await expect(
      async () => await TestMapper.toDto(entity, 'arg1', 'arg2')
    ).rejects.toThrow();
  });
});
