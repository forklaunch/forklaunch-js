export function hasSubscriptionChecks(maybeSubscriptionAuth: unknown) {
  return (
    typeof maybeSubscriptionAuth === 'object' &&
    maybeSubscriptionAuth !== null &&
    'requireActiveSubscription' in maybeSubscriptionAuth &&
    maybeSubscriptionAuth.requireActiveSubscription === true
  );
}
