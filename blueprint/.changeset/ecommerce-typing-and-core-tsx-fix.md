---
"@forklaunch/blueprint-core": patch
"@forklaunch/blueprint-ecommerce-stripe": patch
---

Fix a type-only import written as a value import in blueprint-core, and tighten ecommerce provider-seam typing.

`blueprint/core/registrations.ts` re-exported the Express `Request`, `Response`, `NextFunction`, and `ExpressApplicationOptions` **types** as values. Under tsx-on-source (esbuild strips types without type information) that makes the runtime try to resolve bindings that do not exist, crashing anything loaded that way — including the billing module. They are now re-exported with `export type`. Also widens the shared `IdsSchema` `ids` to `optional`, so "list all" endpoints stop 400ing when called with no `ids` query param.

Ecommerce typing: wrap the base mapper-entity types in `ResolvedEntity<>` (matching billing, so a future relation column can't leak `Reference`/`Collection` wrappers into DTOs), replace an unsafe `as { ids: string[] }` cast in the variant list controller with a type-safe object construction, and narrow the `catch` before treating a thrown value as `Error` in the order-event worker.
