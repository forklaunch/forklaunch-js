import { Constructor } from '../types/configInjector.types';

export function isConstructor(value: unknown): value is Constructor {
  return (
    typeof value === 'function' &&
    value.constructor != null &&
    value.prototype != null
  );
}
