export function hasFeatureChecks(maybeFeatureAuth: unknown) {
  return (
    typeof maybeFeatureAuth === 'object' &&
    maybeFeatureAuth !== null &&
    'requiredFeatures' in maybeFeatureAuth &&
    Array.isArray(maybeFeatureAuth.requiredFeatures) &&
    maybeFeatureAuth.requiredFeatures.length > 0
  );
}
