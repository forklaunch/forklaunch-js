/**
 * Maps a set of service schema factory functions to their instantiated schemas using the provided arguments.
 *
 * @template T - An object whose values are factory functions that accept an options object (Args) and return a schema.
 * @template Args - The type of the options object passed to each factory function (e.g., { validator, uuidId, ... }).
 *
 * @param {T} schemas - An object mapping schema names to factory functions. Each factory function should accept an options object (Args).
 * @param {Args} args - The options object to be passed to each schema factory function.
 * @returns {{ [K in keyof T]: ReturnType<T[K]> }} An object mapping each schema name to its instantiated schema.
 *
 * @example
 * const schemas = {
 *   UserSchemas: (opts) => createUserSchemas(opts),
 *   ProductSchemas: (opts) => createProductSchemas(opts)
 * };
 * const mapped = mapServiceSchemas(schemas, { validator: myValidator });
 * // mapped.UserSchemas, mapped.ProductSchemas now contain the instantiated schemas
 */
export function mapServiceSchemas<
  T extends Record<string, (options: Args) => unknown>,
  Args extends Record<string, unknown>
>(
  schemas: T,
  args: Args
): {
  [K in keyof T]: ReturnType<T[K]>;
} {
  return Object.fromEntries(
    Object.entries(schemas).map(([key, value]) => [key, value(args)])
  ) as {
    [K in keyof T]: ReturnType<T[K]>;
  };
}
