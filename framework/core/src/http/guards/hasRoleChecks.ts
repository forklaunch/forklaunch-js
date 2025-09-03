export function hasRoleChecks(maybeRoledAuth: unknown) {
  return (
    typeof maybeRoledAuth === 'object' &&
    maybeRoledAuth !== null &&
    ('allowedRoles' in maybeRoledAuth || 'forbiddenRoles' in maybeRoledAuth)
  );
}
