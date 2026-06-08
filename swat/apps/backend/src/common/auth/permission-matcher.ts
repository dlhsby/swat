/**
 * Permission matching for the RBAC guard.
 *
 * A permission key is `<resource>:<action>` (e.g. `vehicle:create`). Granted
 * keys may use `*` as a wildcard in either segment (`*:*` = superuser,
 * `vehicle:*` = all vehicle actions). Required keys are always concrete.
 *
 * The seed expands wildcard role patterns into concrete grants, but supporting
 * wildcards here keeps the guard correct if a literal `*:*` grant is ever
 * stored directly.
 */

/** Does a single granted key satisfy a single concrete required key? */
export function permissionMatches(granted: string, required: string): boolean {
  const [grantedResource, grantedAction] = granted.split(':');
  const [requiredResource, requiredAction] = required.split(':');
  const resourceOk = grantedResource === '*' || grantedResource === requiredResource;
  const actionOk = grantedAction === '*' || grantedAction === requiredAction;
  return resourceOk && actionOk;
}

/** Does any granted key satisfy the required key? */
export function hasPermission(granted: readonly string[], required: string): boolean {
  return granted.some((key) => permissionMatches(key, required));
}

/** Does the granted set satisfy every required key (AND semantics)? */
export function hasAllPermissions(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((key) => hasPermission(granted, key));
}
