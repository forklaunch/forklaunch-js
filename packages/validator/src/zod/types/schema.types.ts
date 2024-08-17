import {
  ZodObject as OriginalZodObject,
  ZodArray,
  ZodLiteral,
  ZodNever,
  ZodRawShape,
  ZodType,
  ZodTypeAny,
  ZodUnknown,
  z
} from 'zod';
import {
  IdiomaticSchema,
  Increment,
  LiteralSchema,
  UnboxedObjectSchema
} from '../../shared/types/schema.types';
import { ZodSchemaValidator } from '../zodSchemaValidator';

/**
 * Represents a catch-all Zod schema type.
 */
export type ZodCatchall = ZodTypeAny;

/**
 * Represents an outer array schema type for Zod. If the type T is a Zod object, it will return an array schema of T. Otherwise, it returns ZodNever.
 *
 * @template T - The type to check and possibly convert to an array schema.
 */
export type ZodOuterArray<T> =
  T extends ZodObject<ZodObjectShape> ? ZodArray<T> : ZodNever;

/**
 * Represents the shape of a Zod object schema.
 */
export type ZodObjectShape = ZodRawShape;

/**
 * Represents a Zod object schema type. If the type T is a Zod object shape, it will return the original ZodObject type of T. Otherwise, it returns ZodNever.
 *
 * @template T - The type to check and possibly convert to a Zod object schema.
 */
export type ZodObject<T> = T extends ZodObjectShape
  ? OriginalZodObject<T>
  : ZodNever;

/**
 * Translates a Zod schema type T to its static type if T extends ZodCatchall. Otherwise, it returns ZodNever.
 *
 * @template T - The Zod schema type to translate.
 */
export type ZodSchemaTranslate<T> = T extends ZodCatchall
  ? z.infer<T>
  : ZodNever;

/**
 * Represents an unboxed Zod object schema where each key can have an idiomatic schema.
 */
export type ZodObjectSchema = UnboxedObjectSchema<ZodSchemaValidator>;

/**
 * Represents an idiomatic schema for Zod which can be an unboxed object schema or a literal schema.
 */
export type ZodIdiomaticSchema = IdiomaticSchema<ZodSchemaValidator>;

/**
 * Represents a container for a union of Zod idiomatic schemas.
 */
export type ZodUnionContainer = readonly [
  ZodIdiomaticSchema,
  ZodIdiomaticSchema,
  ...ZodIdiomaticSchema[]
];

/**
 * Resolves a union container to a tuple of resolved Zod idiomatic schemas.
 *
 * @template T - The union container to resolve.
 */
export type UnionZodResolve<T extends ZodUnionContainer> = T extends [
  infer A extends ZodIdiomaticSchema,
  infer B extends ZodIdiomaticSchema,
  ...infer C extends ZodIdiomaticSchema[]
]
  ? [
      ZodResolve<A>,
      ZodResolve<B>,
      ...{
        [K in keyof C]: ZodResolve<C[K]>;
      }
    ]
  : [ZodNever, ZodNever];

/**
 * Resolves a Zod schema type T to its resolved type. The depth is limited to 31 to prevent infinite recursion.
 *
 * @template T - The Zod schema type to resolve.
 * @template Depth - The current depth of the resolution.
 */
export type ZodResolve<T, Depth extends number = 0> = Depth extends 31
  ? ZodUnknown
  : T extends LiteralSchema
    ? ZodLiteral<T>
    : T extends ZodType
      ? T
      : T extends ZodObjectSchema
        ? ZodObject<{
            [K in keyof T]: ZodResolve<T[K], Increment<Depth>>;
          }>
        : ZodNever;