import { ConstructedSingleton, Lifetime } from '../types/configInjector.types';

export function isConstructedSingleton<Args, Return>(
  value: unknown
): value is ConstructedSingleton<Args, Return> {
  return (
    typeof value === 'object' &&
    value != null &&
    'lifetime' in value &&
    value.lifetime === Lifetime.Singleton &&
    'factory' in value
  );
}
