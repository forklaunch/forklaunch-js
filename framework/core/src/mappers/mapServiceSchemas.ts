import { AnySchemaValidator } from '@forklaunch/validator';

/**
 * Maps a set of service schema factory functions to their instantiated schemas using the provided validator.
 *
 * @template T - An object whose values are functions that accept an options object containing a validator and return a schema.
 * @template SV - The type of the schema validator.
 *
 * @param {T} schemas - An object mapping schema names to factory functions. Each factory function should accept an object with a `validator` property.
 * @param {SV} validator - The schema validator instance to be passed to each schema factory function.
 * @returns {{ [K in keyof T]: ReturnType<T[K]> }} An object mapping each schema name to its instantiated schema.
 *
 * @example
 * const schemas = {
 *   UserSchemas: ({ validator }) => createUserSchemas(validator),
 *   ProductSchemas: ({ validator }) => createProductSchemas(validator)
 * };
 * const mapped = mapServiceSchemas(schemas, myValidator);
 * // mapped.UserSchemas, mapped.ProductSchemas now contain the instantiated schemas
 */
export function mapServiceSchemas<
  T extends Record<string, (options: { validator: SV }) => unknown>,
  SV extends AnySchemaValidator
>(
  schemas: T,
  validator: SV
): {
  [K in keyof T]: ReturnType<T[K]>;
} {
  return Object.fromEntries(
    Object.entries(schemas).map(([key, value]) => [key, value({ validator })])
  ) as {
    [K in keyof T]: ReturnType<T[K]>;
  };
}
