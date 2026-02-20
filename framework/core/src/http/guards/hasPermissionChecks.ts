export function hasPermissionChecks(maybePermissionedAuth: unknown) {
  return (
    typeof maybePermissionedAuth === 'object' &&
    maybePermissionedAuth !== null &&
    ((
      'allowedPermissions' in maybePermissionedAuth &&
      (maybePermissionedAuth as any).allowedPermissions != null
    ) || (
        'forbiddenPermissions' in maybePermissionedAuth &&
        (maybePermissionedAuth as any).forbiddenPermissions != null
      ))
  );
}
