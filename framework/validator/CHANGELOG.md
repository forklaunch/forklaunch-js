# @forklaunch/validator

## 0.7.4

### Patch Changes

- remove enum from all packages for erasable syntax
- Updated dependencies
  - @forklaunch/common@0.4.2

## 0.7.3

### Patch Changes

- Reduce zod depth inference a little bit further

## 0.7.2

### Patch Changes

- Lower zod depth checking threshold to help with type inference

## 0.7.1

### Patch Changes

- node types version upgrade
- Updated dependencies
  - @forklaunch/common@0.4.1

## 0.7.0

### Minor Changes

- package version upgrade, mcp generation and nicer universal sdk syntax

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.4.0

## 0.6.16

### Patch Changes

- change dtoMapper to Mapper
- Updated dependencies
  - @forklaunch/common@0.3.14

## 0.6.15

### Patch Changes

- create internal package for internal utilities
- Updated dependencies
  - @forklaunch/common@0.3.13

## 0.6.14

### Patch Changes

- bump package subdependencies
- Updated dependencies
  - @forklaunch/common@0.3.12

## 0.6.13

### Patch Changes

- update package deps

## 0.6.12

### Patch Changes

- use tsgo and export zod types

## 0.6.11

### Patch Changes

- update package versions
- Updated dependencies
  - @forklaunch/common@0.3.11

## 0.6.10

### Patch Changes

- bump package versions, allow for validator custom types that resolve as any, export http framework options type
- Updated dependencies
  - @forklaunch/common@0.3.10

## 0.6.9

### Patch Changes

- update package dependencies
- Updated dependencies
  - @forklaunch/common@0.3.9

## 0.6.8

### Patch Changes

- package conflict resolution
- fix minor buffer bugs and update subdependencies
- Updated dependencies
- Updated dependencies
  - @forklaunch/common@0.3.8

## 0.6.7

### Patch Changes

- update package versions
- Updated dependencies
  - @forklaunch/common@0.3.7

## 0.6.6

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.6

## 0.6.5

### Patch Changes

- increase package dependency versions
- Updated dependencies
  - @forklaunch/common@0.3.5

## 0.6.4

### Patch Changes

- Better file based ergonomics in validator, simplification of types and all but validator is checked by tsgo
- Updated dependencies
  - @forklaunch/common@0.3.4

## 0.6.3

### Patch Changes

- increase package versions
- Updated dependencies
  - @forklaunch/common@0.3.3

## 0.6.2

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.2

## 0.6.1

### Patch Changes

- Add additional options to framework to instantiate applications and routers
- Updated dependencies
  - @forklaunch/common@0.3.1

## 0.6.0

### Minor Changes

- Added support for content types in request/response and fixed edge cases in validator

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.0

## 0.5.4

### Patch Changes

- Increase package versions
- Updated dependencies
  - @forklaunch/common@0.2.11

## 0.5.3

### Patch Changes

- stringify logger arguments
- Updated dependencies
  - @forklaunch/common@0.2.10

## 0.5.2

### Patch Changes

- Various bugfixes, including deduplicated http metrics, multiple constructed singleton loading and leaking empty enqueued redis records"
- Updated dependencies
  - @forklaunch/common@0.2.9

## 0.5.1

### Patch Changes

- Upgrade package versions
- Updated dependencies
  - @forklaunch/common@0.2.8

## 0.5.0

### Minor Changes

- Added persistence into core package, better documentation and more validator utilities

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.2.7

## 0.4.12

### Patch Changes

- Change Typebox catchall from TSchema => TKind for more permissive type matching

## 0.4.11

### Patch Changes

- Fix minor issue where typebox resolution was breaking

## 0.4.10

### Patch Changes

- Update package versions
- Updated dependencies
  - @forklaunch/common@0.2.6

## 0.4.9

### Patch Changes

- Schema Validator types now have runtime typechecking as well

## 0.4.8

### Patch Changes

- Syntactic QOL improvements (validator zod args, config injector, core utilities, test utilities, etc.)
- Updated dependencies
  - @forklaunch/common@0.2.5

## 0.4.7

### Patch Changes

- Increase package dependency versions
- Updated dependencies
  - @forklaunch/common@0.2.4

## 0.4.6

### Patch Changes

- Constrain the auth request to only include discovered parameters for simplicity. Bump package versions.
- Updated dependencies
  - @forklaunch/common@0.2.3

## 0.4.5

### Patch Changes

- bump package versions
- Updated dependencies
  - @forklaunch/common@0.2.2

## 0.4.4

### Patch Changes

- Update dependencies under the hood

## 0.4.3

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.2.1

## 0.4.2

### Patch Changes

- fix config injector ergonomics to be much nicer

## 0.4.1

### Patch Changes

- Validator parse methods now return errors, and config injector now validates class based or schematic singletons, returning a ValidConfigInjector object

## 0.4.0

### Minor Changes

- Changed build from tsc to tsup to accommodate cjs and esm consumers

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.2.0

## 0.3.13

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.14

## 0.3.12

### Patch Changes

- Add schema check to validator interface, and for validating configurations, check if value is a schema and return any errors with pathing

## 0.3.11

### Patch Changes

- Move enum into validator, and bump package versions
- Updated dependencies
  - @forklaunch/common@0.1.13

## 0.3.10

### Patch Changes

- bump package versions to latest
- Updated dependencies
  - @forklaunch/common@0.1.12

## 0.3.9

### Patch Changes

- Adds utilities for removing trailing slashes and checking if a top level property should be optional if all children are optional. Additionally allows Application classes to use all Router methods as an extension.
- Updated dependencies
  - @forklaunch/common@0.1.11

## 0.3.8

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.10

## 0.3.7

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.9

## 0.3.6

### Patch Changes

- Removing es-module type, due to incompatibility with downstream dependencies.
- Updated dependencies
  - @forklaunch/common@0.1.8
