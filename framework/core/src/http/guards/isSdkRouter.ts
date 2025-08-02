import { SdkRouter } from '../types/sdk.types';

/**
 * Checks if a value is a valid SDK router.
 *
 * @param value - The value to check.
 * @returns True if the value is a valid SDK router, false otherwise.
 */
export function isSdkRouter(value: unknown): value is SdkRouter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sdk' in value &&
    '_fetchMap' in value &&
    'sdkPaths' in value
  );
}
