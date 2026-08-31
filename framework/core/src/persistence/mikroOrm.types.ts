import type { MikroORM } from '@mikro-orm/core';

/**
 * `MikroORM` with relaxed type parameters.
 *
 * MikroORM 7.1+ types the third generic as
 * `Entities extends readonly (...)[]` with a *mutable* array default, so
 * `MikroORM.init()` / `new MikroORM(defineConfig(...))` produce instances
 * whose readonly entities tuple is not assignable to a bare `MikroORM`
 * annotation. Use this alias for ORM-valued parameters, fields, and
 * variables that must accept any configured instance.
 *
 * Derived from `init`'s own return type rather than written as
 * `MikroORM<any, any, any>`. The `any`s said "accepts anything", which is
 * broader than the truth and switches off checking on every ORM value in the
 * codebase; deriving keeps the real instance type and follows MikroORM's
 * generics automatically when they change again.
 *
 * @example
 * ```typescript
 * import { AnyMikroORM } from '@forklaunch/core/persistence';
 *
 * function withOrm(orm: AnyMikroORM) {
 *   return orm.em.fork();
 * }
 * ```
 */
export type AnyMikroORM = Awaited<ReturnType<typeof MikroORM.init>>;

/**
 * The resolved, structural view of an inferred entity: its plain data fields
 * only, without mikro-orm's symbol-keyed metadata slots (`PrimaryKeyProp`,
 * `IndexHints`, ...). Those slots embed the raw property-builder record,
 * which is invariant — two identically-shaped entities defined in different
 * packages (or with different builder options such as `.unique()` or
 * `.index()`) will never unify on it. Cross-package entity constraints
 * should compare `ResolvedEntity<(typeof X)['~entity']>` so compatibility is
 * judged on the actual field types, which is what the consuming code reads
 * and writes.
 */
export type ResolvedEntity<T> = {
  [K in keyof T as K extends string ? K : never]: T[K];
};
