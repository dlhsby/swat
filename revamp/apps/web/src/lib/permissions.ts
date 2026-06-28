/**
 * Frontend permission matcher — mirrors the backend `permission-matcher`
 * (resource:action with wildcards). A grant matches a required key when it is:
 *   - `*:*`            → superuser, matches everything
 *   - `resource:*`     → all actions on a resource
 *   - `*:action`       → an action across all resources
 *   - exactly the key  → exact match
 *
 * Permission gating on the client is a UX convenience only; the server is the
 * authoritative gate. Keep this in sync with the backend matcher.
 */
export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.length === 0) {
    return false;
  }
  const [reqResource, reqAction] = required.split(':');
  return granted.some((key) => {
    const [resource, action] = key.split(':');
    const resourceOk = resource === '*' || resource === reqResource;
    const actionOk = action === '*' || action === reqAction;
    return resourceOk && actionOk;
  });
}

/** True when the caller holds at least one of the required keys (OR semantics). */
export function hasAnyPermission(granted: readonly string[], required: readonly string[]): boolean {
  return required.some((key) => hasPermission(granted, key));
}

/** True when the caller holds every required key (AND semantics). */
export function hasAllPermissions(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((key) => hasPermission(granted, key));
}
