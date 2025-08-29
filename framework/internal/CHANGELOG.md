# @forklaunch/common

## 0.3.2

### Patch Changes

- toDto -> toDomain
- Updated dependencies
  - @forklaunch/validator@0.10.2
  - @forklaunch/common@0.6.2

## 0.3.1

### Patch Changes

- request and response mapper discrimination and clean up of internal types
- Updated dependencies
  - @forklaunch/validator@0.10.1
  - @forklaunch/common@0.6.1

## 0.3.0

### Minor Changes

- remove class based mappers

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.10.0
  - @forklaunch/common@0.6.0

## 0.2.9

### Patch Changes

- add mappers as functions
- Updated dependencies
  - @forklaunch/validator@0.9.9
  - @forklaunch/common@0.5.8

## 0.2.8

### Patch Changes

- One more attempt at performance bump
- Updated dependencies
  - @forklaunch/validator@0.9.8
  - @forklaunch/common@0.5.7

## 0.2.7

### Patch Changes

- prettify req init for slightly faster sdk access
- Updated dependencies
  - @forklaunch/validator@0.9.7
  - @forklaunch/common@0.5.6

## 0.2.6

### Patch Changes

- attempt to make sdk pathing more efficient
- Updated dependencies
  - @forklaunch/validator@0.9.6
  - @forklaunch/common@0.5.5

## 0.2.5

### Patch Changes

- zod validator regex relaxation for email
- Updated dependencies
  - @forklaunch/validator@0.9.5
  - @forklaunch/common@0.5.4

## 0.2.4

### Patch Changes

- Update validator types for files to use raw streams, lazy load openapi for universal sdk, and remove private members from otel
- Updated dependencies
  - @forklaunch/validator@0.9.4
  - @forklaunch/common@0.5.3

## 0.2.3

### Patch Changes

- update package versions
- Updated dependencies
  - @forklaunch/validator@0.9.3
  - @forklaunch/common@0.5.2

## 0.2.2

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.9.2

## 0.2.1

### Patch Changes

- bump internal packages
- Updated dependencies
  - @forklaunch/validator@0.9.1
  - @forklaunch/common@0.5.1

## 0.2.0

### Minor Changes

- Adds more configuration options for application and routers. Additionally adds optional cluster support built-in (experimental)

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.9.0
  - @forklaunch/common@0.5.0

## 0.1.9

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.8.0

## 0.1.8

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.7.8
  - @forklaunch/common@0.4.6

## 0.1.7

### Patch Changes

- Update to zod v4, keeping zod v3 as active zod version
- Updated dependencies
  - @forklaunch/validator@0.7.7
  - @forklaunch/common@0.4.5

## 0.1.6

### Patch Changes

- Upgrade internal dependencies
- Updated dependencies
  - @forklaunch/validator@0.7.6
  - @forklaunch/common@0.4.4

## 0.1.5

### Patch Changes

- Auth types are now propogated to live sdk types
- Updated dependencies
  - @forklaunch/validator@0.7.5
  - @forklaunch/common@0.4.3

## 0.1.4

### Patch Changes

- remove enum from all packages for erasable syntax
- Updated dependencies
  - @forklaunch/validator@0.7.4
  - @forklaunch/common@0.4.2

## 0.1.3

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.7.3

## 0.1.2

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.7.2

## 0.1.1

### Patch Changes

- node types version upgrade
- Updated dependencies
  - @forklaunch/validator@0.7.1
  - @forklaunch/common@0.4.1

## 0.1.0

### Minor Changes

- package version upgrade, mcp generation and nicer universal sdk syntax

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.7.0
  - @forklaunch/common@0.4.0

## 0.0.7

### Patch Changes

- remove schema validator from identity mappers

## 0.0.6

### Patch Changes

- missed schema validator

## 0.0.5

### Patch Changes

- remove schema validator requirement, since the mapper is constructed

## 0.0.4

### Patch Changes

- change dtoMapper to Mapper
- Updated dependencies
  - @forklaunch/validator@0.6.16
  - @forklaunch/common@0.3.14

## 0.0.3

### Patch Changes

- return promise from identity mapper

## 0.0.2

### Patch Changes

- move internal utilities out of core and into internal

## 0.0.1

### Patch Changes

- create internal package for internal utilities
- Updated dependencies
  - @forklaunch/validator@0.6.15
  - @forklaunch/common@0.3.13

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
