import {
  TObject as OriginalTObject,
  Static,
  TArray,
  TKind,
  TLiteral,
  TNever,
  TProperties,
  TSchema,
  TUnknown
} from '@sinclair/typebox';
import { TypeCheck } from '@sinclair/typebox/compiler';
import { Increment, KeyTypes, LiteralSchema } from '../../types/schema.types';

/**
 * Represents a catch-all schema type.
 */
export type TCatchall = TSchema;

/**
 * Represents an outer array schema type. If the type T is an object shape, it will return an array schema of T. Otherwise, it returns TNever.
 *
 * @template T - The type to check and possibly convert to an array schema.
 */
export type TOuterArray<T> =
  T extends TObject<TObjectShape> ? TArray<T> : TNever;

/**
 * Represents the shape of an object schema.
 */
export type TObjectShape = TProperties;

/**
 * Represents an object schema type. If the type T is an object shape, it will return the original TObject type of T. Otherwise, it returns TNever.
 *
 * @template T - The type to check and possibly convert to an object schema.
 */
export type TObject<T> = T extends TObjectShape ? OriginalTObject<T> : TNever;

/**
 * Translates a schema type T to its static type if T extends TCatchall. Otherwise, it returns TNever.
 *
 * @template T - The schema type to translate.
 */
export type TSchemaTranslate<T> = T extends TCatchall ? Static<T> : TNever;

/**
 * Represents an unboxed object schema where each key can have an idiomatic schema.
 */
export type UnboxedTObjectSchema = {
  [key: KeyTypes]: TIdiomaticSchema;
};

/**
 * Represents an idiomatic schema which can be an unboxed object schema or a literal schema.
 */
export type TIdiomaticSchema = UnboxedTObjectSchema | LiteralSchema;

/**
 * Represents a container for a union of idiomatic schemas.
 */
export type TUnionContainer = [...TIdiomaticSchema[]];

/**
 * Resolves a union container to a tuple of resolved idiomatic schemas.
 *
 * @template T - The union container to resolve.
 */
export type UnionTResolve<T extends TUnionContainer> =
  T extends (infer UnionTypes)[] ? [TResolve<UnionTypes>] : TNever;

/**
 * Resolves a schema type T to its resolved type. The depth is limited to 12 to prevent infinite recursion, due to StaticDecode limitations.
 *
 * @template T - The schema type to resolve.
 * @template Depth - The current depth of the resolution.
 */
export type TResolve<T, Depth extends number = 0> = Depth extends 22
  ? TUnknown
  : T extends LiteralSchema
    ? TLiteral<T>
    : T extends TKind
      ? T
      : T extends TObject<TObjectShape>
        ? T
        : T extends UnboxedTObjectSchema
          ? TObject<{
              [K in keyof T]: TResolve<T[K], Increment<Depth>>;
            }>
          : T extends TypeCheck<infer Type>
            ? TResolve<Type>
            : TNever;
