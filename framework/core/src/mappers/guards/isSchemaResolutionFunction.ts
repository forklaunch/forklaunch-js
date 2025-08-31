import { SchemaResolutionFunction } from '../types/schemaResolution.types';

/**
 * Type guard to determine if a value is a SchemaResolutionFunction.
 *
 * @template Args - The type of the options object expected by the schema resolution function.
 * @param {unknown} value - The value to check.
 * @returns {value is SchemaResolutionFunction<Args>} True if the value is a function (assumed to be a SchemaResolutionFunction), false otherwise.
 */
export function isSchemaResolutionFunction<
  Args extends Record<string, unknown>
>(value: unknown): value is SchemaResolutionFunction<Args> {
  return typeof value === 'function';
}
