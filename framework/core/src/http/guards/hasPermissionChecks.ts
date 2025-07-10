export function hasPermissionChecks(maybePermissionedAuth: unknown) {
  return (
    typeof maybePermissionedAuth === 'object' &&
    maybePermissionedAuth !== null &&
    'mapPermissions' in maybePermissionedAuth &&
    ('allowedPermissions' in maybePermissionedAuth ||
      'forbiddenPermissions' in maybePermissionedAuth)
  );
}
