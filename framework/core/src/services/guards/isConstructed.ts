import { Constructed } from '../types/configInjector.types';

export function isConstructed<Type, Args, Return>(
  value: unknown
): value is Constructed<Type, Args, Return> {
  return (
    typeof value === 'object' &&
    value != null &&
    'constructor' in value &&
    value.constructor != null
  );
}
