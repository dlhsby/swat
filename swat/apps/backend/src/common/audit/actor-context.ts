import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The acting principal for the current request, captured from the session so the
 * audit layer (Prisma middleware) can stamp `createdById`/`updatedById`/
 * `deletedById` and write `AuditLog` rows without every service threading it.
 */
export interface Actor {
  readonly id: string | null;
  /** Human-readable name for AuditLog.actorName (falls back to "system"). */
  readonly name: string;
}

const SYSTEM_ACTOR: Actor = { id: null, name: 'system' };

const storage = new AsyncLocalStorage<Actor>();

/** Run `fn` (and everything it awaits) with `actor` as the ambient principal. */
export function runWithActor<T>(actor: Actor, fn: () => T): T {
  return storage.run(actor, fn);
}

/** The current request's actor, or a `system` actor outside a request (jobs, seed). */
export function getActor(): Actor {
  return storage.getStore() ?? SYSTEM_ACTOR;
}
