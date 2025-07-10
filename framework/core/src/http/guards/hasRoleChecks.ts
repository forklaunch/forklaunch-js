export function hasRoleChecks(maybeRoledAuth: unknown) {
  return (
    typeof maybeRoledAuth === 'object' &&
    maybeRoledAuth !== null &&
    'mapRoles' in maybeRoledAuth &&
    ('allowedRoles' in maybeRoledAuth || 'forbiddenRoles' in maybeRoledAuth)
  );
}
