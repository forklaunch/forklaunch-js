import { sortObjectKeys } from '@forklaunch/common';
import { IdiomaticSchema } from '@forklaunch/validator';

import { Schema } from '@forklaunch/validator';
import {
  TypeboxSchemaValidator,
  parse as typeboxParse
} from '@forklaunch/validator/typebox';
import {
  ZodSchemaValidator,
  parse as zodParse
} from '@forklaunch/validator/zod';

export function testSchemaEquality<
  Z extends IdiomaticSchema<ZodSchemaValidator>,
  T extends IdiomaticSchema<TypeboxSchemaValidator>
>(zodSchema: Z, typeBoxSchema: T, testData: Schema<Z, ZodSchemaValidator>) {
  const zodParseResult = zodParse(zodSchema, testData);
  const typeboxParseResult = typeboxParse(typeBoxSchema, testData);

  const isEqual =
    JSON.stringify(
      zodParseResult.ok
        ? sortObjectKeys(
            zodParseResult.value as unknown as Record<string, unknown>
          )
        : '-1'
    ) ===
    JSON.stringify(
      typeboxParseResult.ok ? sortObjectKeys(typeboxParseResult.value) : '1'
    );

  return isEqual as Schema<Z, ZodSchemaValidator> extends Schema<
    T,
    TypeboxSchemaValidator
  >
    ? Schema<T, TypeboxSchemaValidator> extends Schema<Z, ZodSchemaValidator>
      ? true
      : false
    : false;
}

export enum DummyEnum {
  A = 'A',
  B = 'B'
}
