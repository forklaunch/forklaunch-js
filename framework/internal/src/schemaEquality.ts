import { safeStringify, sortObjectKeys } from '@forklaunch/common';
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

export function testSchemaEquality<Schematic>() {
  return <
    Z extends IdiomaticSchema<ZodSchemaValidator>,
    T extends IdiomaticSchema<TypeboxSchemaValidator>
  >(
    zodSchema: Z,
    typeBoxSchema: T,
    testData: Schematic extends Schema<Z, ZodSchemaValidator>
      ? Schema<Z, ZodSchemaValidator> extends Schematic
        ? Schematic extends Schema<T, TypeboxSchemaValidator>
          ? Schema<T, TypeboxSchemaValidator> extends Schematic
            ? Schematic
            : { _success: never } & Schematic
          : { _success: never } & Schematic
        : { _success: never } & Schematic
      : { _success: never } & Schematic
  ) => {
    const zodParseResult = zodParse(zodSchema, testData);
    const typeboxParseResult = typeboxParse(typeBoxSchema, testData);

    const isEqual =
      safeStringify(
        zodParseResult.ok ? sortObjectKeys(zodParseResult.value) : '-1'
      ) ===
      safeStringify(
        typeboxParseResult.ok
          ? sortObjectKeys(typeboxParseResult.value as Record<string, unknown>)
          : '1'
      );

    return isEqual as EqualityWithoutFunction<T, Z>;
  };
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

export const DummyEnum = {
  A: 'A',
  B: 'B'
} as const;
export type DummyEnum = (typeof DummyEnum)[keyof typeof DummyEnum];
