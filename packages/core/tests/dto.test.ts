import { SchemaValidator } from "@forklaunch/validator/interfaces";
import { TypeboxSchemaValidator, number, string } from "@forklaunch/validator/typebox";
import { TCatchall, TIdiomaticSchema, TUnionContainer } from "@forklaunch/validator/typebox/types";
import { BaseEntity } from "../database/mikro/models/entities/base.entity";
import { RequestEntityMapper } from "../entityMapper/models/requestEntityMapper.model";
import { ResponseEntityMapper } from "../entityMapper/models/responseEntityMapper.model";

class TestEntity extends BaseEntity {
    name: string;
    age: number;
}

class T extends RequestEntityMapper<TestEntity, TypeboxSchemaValidator> {
    toEntity(...additionalArgs: unknown[]): TestEntity {
        const entity = new TestEntity();
        entity.id = this.dto.id;
        entity.name = this.dto.name;
        entity.age = this.dto.age;

        return entity;
    }
    schema = {
        id: string,
        name: string,
        age: number
    };

}

const y = new T(new TypeboxSchemaValidator());
y.fromJson({ id: '123', name: 'test', age: 1 });

var x = { id: '123', name: 'test', age: 1 };

type r = typeof x extends T['_dto'] ? true : false;

T.fromJson(new TypeboxSchemaValidator(), x);
T.fromJson(new TypeboxSchemaValidator(), { 
    id: '123', 
    name: 'test', 
    age: 1 
});

class TestRequestEntityMapper extends RequestEntityMapper<TestEntity, TypeboxSchemaValidator> {
    schema = {
        id: string,
        name: string,
        age: number,
    };

    toEntity(...additionalArgs: unknown[]): TestEntity {
        const entity = new TestEntity();
        entity.id = this.dto.id;
        entity.name = this.dto.name;
        entity.age = this.dto.age;

        return entity;
    }
}

type h = Expand<SchemaValidator>;
type TypeboxSV = SchemaValidator<TUnionContainer, TIdiomaticSchema, TCatchall>;
type y = TypeboxSchemaValidator extends SchemaValidator ? true : false;
type j = TypeboxSV extends SchemaValidator<unknown, unknown, unknown> ? true : false;
type m = TypeboxSV extends TypeboxSchemaValidator ? true : false;
type n = TypeboxSchemaValidator extends TypeboxSV ? true : false;
type k = string extends unknown ? true : false;
type u = Expand<TypeboxSchemaValidator>;
type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T;
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;


class TestResponseEntityMapper extends ResponseEntityMapper<TestEntity, TypeboxSchemaValidator> {
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

type iii = Expand<TestResponseEntityMapper['schema']>;

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
            age: 1,
        };

        const responseEM = TestRequestEM.fromJson(json);
        const staticEM = TestRequestEntityMapper.fromJson(new TypeboxSchemaValidator(), json);
        const expectedDto = {
            id: '123',
            name: 'test',
            age: 1,
        };

        expect(staticEM.dto).toEqual(expectedDto);
        expect(responseEM.dto).toEqual(expectedDto);
        expect(responseEM.dto).toEqual(staticEM.dto);
    });

    test('Deserialization Equality', async () => {
        const json = {
            id: '123',
            name: 'test',
            age: 1,
        };

        const entity = extractNonTimeBasedEntityFields(TestRequestEM.deserializeJsonToEntity(json));
        const objectEntity = extractNonTimeBasedEntityFields(TestRequestEM.fromJson(json).toEntity());
        const staticEntity = extractNonTimeBasedEntityFields(TestRequestEntityMapper.deserializeJsonToEntity(new TypeboxSchemaValidator(), json));
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
            name: 'test',
        };

        // @ts-expect-error
        expect(() => TestRequestEM.fromJson(json)).toThrow();
        // @ts-expect-error
        expect(() => TestRequestEntityMapper.fromJson(new TypeboxSchemaValidator(), json)).toThrow();
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
        const staticEM = TestResponseEntityMapper.fromEntity(new TypeboxSchemaValidator(), entity);
        const expectedDto = {
            id: '123',
            name: 'test',
            age: 1,
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
        const staticJson = TestResponseEntityMapper.serializeEntityToJson(new TypeboxSchemaValidator(), entity);
        const expectedJson = {
            id: '123',
            name: 'test',
            age: 1,
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
        expect(() => TestResponseEntityMapper.fromEntity(new TypeboxSchemaValidator(), entity).toJson()).toThrow();
    });
});

