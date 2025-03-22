import { Constructed } from '../types/configInjector.types';

export function isConstructed(
  value: unknown
): value is Constructed<unknown, unknown> {
  return (
    typeof value === 'object' &&
    value != null &&
    'constructor' in value &&
    value.constructor != null
  );
}
