---
'@forklaunch/implementation-billing-base': patch
'@forklaunch/implementation-billing-stripe': patch
'@forklaunch/implementation-cac-base': patch
'@forklaunch/implementation-ecommerce-base': patch
'@forklaunch/implementation-ecommerce-paypal': patch
'@forklaunch/implementation-ecommerce-stripe': patch
'@forklaunch/implementation-iam-base': patch
'@forklaunch/implementation-messaging-base': patch
'@forklaunch/implementation-messaging-twilio': patch
'@forklaunch/implementation-worker-bullmq': patch
'@forklaunch/implementation-worker-database': patch
'@forklaunch/implementation-worker-kafka': patch
'@forklaunch/implementation-worker-redis': patch
'@forklaunch/interfaces-billing': patch
'@forklaunch/interfaces-cac': patch
'@forklaunch/interfaces-ecommerce': patch
'@forklaunch/interfaces-iam': patch
'@forklaunch/interfaces-messaging': patch
'@forklaunch/interfaces-worker': patch
---

Declare uWebSockets.js directly and align first-party dependency versions.

`@forklaunch/hyper-express` and `@forklaunch/hyper-express-fork` now take
uWebSockets.js as a peer rather than a dependency. pnpm 11 refuses a
git-resolved package when it arrives as a subdependency and permits it as a
direct one, and uWebSockets.js is only ever installed from its GitHub tarball —
so every package depending on either one has to declare it itself. That covers
packages depending on the fork directly, not only on the wrapper.

The first-party `@forklaunch/*` ranges move to the currently published versions
in the same pass. They had to: taking the new hyper-express on its own left two
copies of `@forklaunch/validator` in the tree, and TypeScript rejected the
result outright rather than picking one —

    error TS2883: The inferred type of 'BaseUserServiceSchemas' cannot be named
    without a reference to 'AnySchemaValidator' from
    '.pnpm/@forklaunch+validator@1.2.25/...'. This is likely not portable.

The mechanism is worth remembering, because a version range that already
tolerates the newer release is exactly the case where nothing forces a
re-resolution: the lockfile keeps the old version for the packages that declare
it, while a newly added dependency resolves the same range to the new one, and
the two copies coexist until something type-checks across them.
