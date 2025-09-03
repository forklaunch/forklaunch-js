export function hasPermissionChecks(maybePermissionedAuth: unknown) {
  return (
    typeof maybePermissionedAuth === 'object' &&
    maybePermissionedAuth !== null &&
    ('allowedPermissions' in maybePermissionedAuth ||
      'forbiddenPermissions' in maybePermissionedAuth)
  );
}
