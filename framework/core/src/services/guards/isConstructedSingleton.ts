import { ConstructedSingleton, Lifetime } from '../types/configInjector.types';

export function isConstructedSingleton<Type, Args, Return>(
  value: unknown
): value is ConstructedSingleton<Type, Args, Return> {
  return (
    typeof value === 'object' &&
    value != null &&
    'lifetime' in value &&
    value.lifetime === Lifetime.Singleton &&
    'factory' in value
  );
}
