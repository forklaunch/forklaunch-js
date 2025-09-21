import { SdkHandler } from '../types/sdk.types';

/**
 * Type guard to determine if a given value is an SdkHandler.
 *
 * @param handler - The value to check.
 * @returns True if the value is an SdkHandler, false otherwise.
 */
export function isSdkHandler(handler: unknown): handler is SdkHandler {
  return (
    typeof handler === 'object' &&
    handler !== null &&
    '_path' in handler &&
    '_method' in handler &&
    'contractDetails' in handler
  );
}
