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
 * @example
 * ```typescript
 * import { AnyMikroORM } from '@forklaunch/core/persistence';
 *
 * function withOrm(orm: AnyMikroORM) {
 *   return orm.em.fork();
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMikroORM = MikroORM<any, any, any>;
