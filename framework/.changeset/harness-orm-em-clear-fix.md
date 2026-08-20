---
"@forklaunch/testing": patch
---

Fix BlueprintTestHarness so generated app E2E tests can actually run.

`clearTestDatabase` now reads the entity list from `orm.config.get('entities')`
(MikroORM v7's `getMetadata().getAll()` returns an empty object, so the old
code cleared nothing and re-seeds hit duplicate-key errors), and clears in a
foreign-key-safe retry-until-stable order instead of a single reverse pass.

Pairs with the blueprint test-utils change that hands the harness its own
`discovery` object, so `MikroORM.init()` can't mutate the app's shared config
and leave the app container's `new MikroORM(config)` with an undefined `.em`.
