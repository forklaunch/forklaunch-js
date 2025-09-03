import { AnySchemaValidator, IdiomaticSchema } from '@forklaunch/validator';
import { isSchemaResolutionFunction } from './guards/isSchemaResolutionFunction';
import { SchemaResolutionFunction } from './types/schemaResolution.types';

/**
 * Maps a set of service schema factories or pre-instantiated schemas to their resolved schemas using the provided arguments.
 *
 * This utility allows you to provide an object whose values are either:
 *   - Schema factory functions (SchemaResolutionFunction) that accept an options object (Args) and return a schema or schema group.
 *   - Already-instantiated schemas (IdiomaticSchema).
 *
 * Each factory function will be called with the provided `args` object, and the result will be included in the returned mapping.
 * If a value is already a schema (not a function), it is returned as-is.
 *
 * @template SV - The schema validator type.
 * @template T - An object whose values are either schema factory functions or instantiated schemas.
 * @template Args - The type of the options object passed to each factory function (e.g., { validator, uuidId, ... }).
 *
 * @param {T} schemas - An object mapping schema names to either factory functions (SchemaResolutionFunction) or instantiated schemas (IdiomaticSchema).
 * @param {Args} args - The options object to be passed to each schema factory function.
 * @returns {{ [K in keyof T]: T[K] extends SchemaResolutionFunction<Args> ? ReturnType<T[K]> : T[K] }} An object mapping each schema name to its resolved schema.
 *
 * @example
 * const schemas = {
 *   UserSchemas: (opts) => createUserSchemas(opts),
 *   ProductSchemas: (opts) => createProductSchemas(opts),
 *   AlreadyInstantiated: someSchemaObject
 * };
 * const mapped = mapServiceSchemas(schemas, { validator: myValidator });
 * // mapped.UserSchemas and mapped.ProductSchemas are instantiated, mapped.AlreadyInstantiated is passed through
 */
export function mapServiceSchemas<
  SV extends AnySchemaValidator,
  T extends Record<
    string,
    SchemaResolutionFunction<Args> | IdiomaticSchema<SV>
  >,
  Args extends Record<string, unknown>
>(
  schemas: T,
  args: Args
): {
  [K in keyof T]: T[K] extends SchemaResolutionFunction<Args>
    ? ReturnType<T[K]>
    : T[K];
} {
  return Object.fromEntries(
    Object.entries(schemas).map(([key, value]) => [
      key,
      isSchemaResolutionFunction(value) ? value(args) : value
    ])
  ) as {
    [K in keyof T]: T[K] extends SchemaResolutionFunction<Args>
      ? ReturnType<T[K]>
      : T[K];
  };
}
