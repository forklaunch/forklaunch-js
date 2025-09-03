/**
 * A function type that, given an options object, returns a schema or schema-like object.
 *
 * @template Args - The type of the options object, typically an object with configuration or dependencies.
 * @param {Args} options - The options to use for schema resolution (e.g., validator, uuidId, etc.).
 * @returns {unknown} The resolved schema or schema-like object.
 */
export type SchemaResolutionFunction<Args extends Record<string, unknown>> = (
  options: Args
) => unknown;
