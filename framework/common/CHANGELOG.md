# @forklaunch/common

## 0.5.7

### Patch Changes

- One more attempt at performance bump

## 0.5.6

### Patch Changes

- prettify req init for slightly faster sdk access

## 0.5.5

### Patch Changes

- attempt to make sdk pathing more efficient

## 0.5.4

### Patch Changes

- zod validator regex relaxation for email

## 0.5.3

### Patch Changes

- Update validator types for files to use raw streams, lazy load openapi for universal sdk, and remove private members from otel

## 0.5.2

### Patch Changes

- update package versions

## 0.5.1

### Patch Changes

- bump internal packages

## 0.5.0

### Minor Changes

- Adds more configuration options for application and routers. Additionally adds optional cluster support built-in (experimental)

## 0.4.6

### Patch Changes

- Add versions to contract details, migrate sdk and fetch to functions for much better ergonomics

## 0.4.5

### Patch Changes

- Update to zod v4, keeping zod v3 as active zod version

## 0.4.4

### Patch Changes

- Upgrade internal dependencies

## 0.4.3

### Patch Changes

- Auth types are now propogated to live sdk types

## 0.4.2

### Patch Changes

- remove enum from all packages for erasable syntax

## 0.4.1

### Patch Changes

- node types version upgrade

## 0.4.0

### Minor Changes

- package version upgrade, mcp generation and nicer universal sdk syntax

## 0.3.14

### Patch Changes

- change dtoMapper to Mapper

## 0.3.13

### Patch Changes

- create internal package for internal utilities

## 0.3.12

### Patch Changes

- bump package subdependencies

## 0.3.11

### Patch Changes

- update package versions

## 0.3.10

### Patch Changes

- bump package versions, allow for validator custom types that resolve as any, export http framework options type

## 0.3.9

### Patch Changes

- update package dependencies

## 0.3.8

### Patch Changes

- package conflict resolution
- fix minor buffer bugs and update subdependencies

## 0.3.7

### Patch Changes

- update package versions

## 0.3.6

### Patch Changes

- Move getEnvVar into common package and allow for cors options during application instantiation

## 0.3.5

### Patch Changes

- increase package dependency versions

## 0.3.4

### Patch Changes

- Better file based ergonomics in validator, simplification of types and all but validator is checked by tsgo

## 0.3.3

### Patch Changes

- increase package versions

## 0.3.2

### Patch Changes

- update package versions

## 0.3.1

### Patch Changes

- Add additional options to framework to instantiate applications and routers

## 0.3.0

### Minor Changes

- Added support for content types in request/response and fixed edge cases in validator

## 0.2.11

### Patch Changes

- Increase package versions

## 0.2.10

### Patch Changes

- stringify logger arguments

## 0.2.9

### Patch Changes

- Various bugfixes, including deduplicated http metrics, multiple constructed singleton loading and leaking empty enqueued redis records"

## 0.2.8

### Patch Changes

- Upgrade package versions

## 0.2.7

### Patch Changes

- Added persistence into core package, better documentation and more validator utilities

## 0.2.6

### Patch Changes

- Update package versions

## 0.2.5

### Patch Changes

- Syntactic QOL improvements (validator zod args, config injector, core utilities, test utilities, etc.)

## 0.2.4

### Patch Changes

- Increase package dependency versions

## 0.2.3

### Patch Changes

- Constrain the auth request to only include discovered parameters for simplicity. Bump package versions.

## 0.2.2

### Patch Changes

- bump package versions

## 0.2.1

### Patch Changes

- Add utility to strip undefined properties from an object

## 0.2.0

### Minor Changes

- Changed build from tsc to tsup to accommodate cjs and esm consumers

## 0.1.14

### Patch Changes

- changes to extractArgumentNames to accomodate exploded params

## 0.1.13

### Patch Changes

- Move enum into validator, and bump package versions

## 0.1.12

### Patch Changes

- bump package versions to latest

## 0.1.11

### Patch Changes

- Adds utilities for removing trailing slashes and checking if a top level property should be optional if all children are optional. Additionally allows Application classes to use all Router methods as an extension.

## 0.1.10

### Patch Changes

- adds proper exports to packages

## 0.1.9

### Patch Changes

- Add flatten type to flatten deeply nested objects

## 0.1.8

### Patch Changes

- Removing es-module type, due to incompatibility with downstream dependencies.
