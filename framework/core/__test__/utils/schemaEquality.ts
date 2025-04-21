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

  return isEqual as EqualityWithoutFunction<T, Z>;
}

type InjectiveWithoutFunction<O, T> = {
  [K in keyof O]: K extends keyof T
    ? O[K] extends object
      ? T[K] extends object
        ? InjectiveWithoutFunction<O[K], T[K]>
        : false
      : O[K] extends (...args: never[]) => unknown
        ? T[K] extends (...args: never[]) => unknown
          ? true
          : false
        : O[K] extends T[K]
          ? T[K] extends O[K]
            ? true
            : false
          : false
    : false;
} extends infer R
  ? R extends {
      [K in keyof R]: true;
    }
    ? true
    : false
  : false;

type EqualityWithoutFunction<
  T extends IdiomaticSchema<TypeboxSchemaValidator>,
  Z extends IdiomaticSchema<ZodSchemaValidator>
> =
  Schema<T, TypeboxSchemaValidator> extends infer TypeboxSchema
    ? Schema<Z, ZodSchemaValidator> extends infer ZodSchema
      ? InjectiveWithoutFunction<
          TypeboxSchema,
          ZodSchema
        > extends InjectiveWithoutFunction<ZodSchema, TypeboxSchema>
        ? true
        : false
      : false
    : false;

export enum DummyEnum {
  A = 'A',
  B = 'B'
}
