import { SchemaValidator } from "../index";
import { LiteralSchema } from "../types/schema.types";


export class MockSchemaValidator implements SchemaValidator {
    string = 'string';
    number = 'number';
    bigint = 'bigint';
    boolean = 'boolean';
    date = 'date';
    symbol = 'symbol';
    empty = 'empty';
    any = 'any';
    unknown = 'unknown';
    never = 'never';

    schemify<T>(schema: T) {
        return schema;
    };
    optional<T>(schema: T) {
        return 'optional ' + schema;
    };
    array<T>(schema: T) {
        return 'array ' + schema;
    }
    union<T>(schemas: T[]) {
        return schemas.join(' | ');
    }
    literal<T extends LiteralSchema>(schema: T) {
        return 'literal ' + schema;
    };
    validate<T>(schema: T) {
        return true;
    };
    openapi<T>(schema: T) {
        return {};
    }
}