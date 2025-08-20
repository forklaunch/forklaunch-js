# @forklaunch/universal-sdk

## 0.6.0

### Minor Changes

- Adds more configuration options for application and routers. Additionally adds optional cluster support built-in (experimental)

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.5.0

## 0.5.4

### Patch Changes

- Add versions to contract details, migrate sdk and fetch to functions for much better ergonomics
- Updated dependencies
  - @forklaunch/common@0.4.6

## 0.5.3

### Patch Changes

- Fix universal sdk bugs and address fetch thrashing internally

## 0.5.2

### Patch Changes

- Update to zod v4, keeping zod v3 as active zod version
- Updated dependencies
  - @forklaunch/common@0.4.5

## 0.5.1

### Patch Changes

- Upgrade internal dependencies
- Updated dependencies
  - @forklaunch/common@0.4.4

## 0.5.0

### Minor Changes

- Auth types are now propogated to live sdk types

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.4.3

## 0.4.2

### Patch Changes

- remove enum from all packages for erasable syntax
- Updated dependencies
  - @forklaunch/common@0.4.2

## 0.4.1

### Patch Changes

- node types version upgrade
- Updated dependencies
  - @forklaunch/common@0.4.1

## 0.4.0

### Minor Changes

- package version upgrade, mcp generation and nicer universal sdk syntax

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.4.0

## 0.3.16

### Patch Changes

- change dtoMapper to Mapper
- Updated dependencies
  - @forklaunch/common@0.3.14

## 0.3.15

### Patch Changes

- create internal package for internal utilities
- Updated dependencies
  - @forklaunch/common@0.3.13

## 0.3.14

### Patch Changes

- bump package subdependencies
- Updated dependencies
  - @forklaunch/common@0.3.12

## 0.3.13

### Patch Changes

- update package deps

## 0.3.12

### Patch Changes

- update package versions
- Updated dependencies
  - @forklaunch/common@0.3.11

## 0.3.11

### Patch Changes

- bump package versions, allow for validator custom types that resolve as any, export http framework options type
- Updated dependencies
  - @forklaunch/common@0.3.10

## 0.3.10

### Patch Changes

- update package dependencies
- Updated dependencies
  - @forklaunch/common@0.3.9

## 0.3.9

### Patch Changes

- package conflict resolution
- fix minor buffer bugs and update subdependencies
- Updated dependencies
- Updated dependencies
  - @forklaunch/common@0.3.8

## 0.3.8

### Patch Changes

- update package versions
- Updated dependencies
  - @forklaunch/common@0.3.7

## 0.3.7

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.6

## 0.3.6

### Patch Changes

- increase package dependency versions
- Updated dependencies
  - @forklaunch/common@0.3.5

## 0.3.5

### Patch Changes

- simplify controller types

## 0.3.4

### Patch Changes

- Better file based ergonomics in validator, simplification of types and all but validator is checked by tsgo
- Updated dependencies
  - @forklaunch/common@0.3.4

## 0.3.3

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.3

## 0.3.2

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.2

## 0.3.1

### Patch Changes

- Add additional options to framework to instantiate applications and routers
- Updated dependencies
  - @forklaunch/common@0.3.1

## 0.3.0

### Minor Changes

- Added support for content types in request/response and fixed edge cases in validator

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.0

## 0.2.8

### Patch Changes

- Increase package versions

## 0.2.7

### Patch Changes

- stringify logger arguments

## 0.2.6

### Patch Changes

- Various bugfixes, including deduplicated http metrics, multiple constructed singleton loading and leaking empty enqueued redis records"

## 0.2.5

### Patch Changes

- Upgrade package versions

## 0.2.4

### Patch Changes

- Update package versions

## 0.2.3

### Patch Changes

- Syntactic QOL improvements (validator zod args, config injector, core utilities, test utilities, etc.)

## 0.2.2

### Patch Changes

- Constrain the auth request to only include discovered parameters for simplicity. Bump package versions.

## 0.2.1

### Patch Changes

- bump package versions

## 0.2.0

### Minor Changes

- Changed build from tsc to tsup to accommodate cjs and esm consumers

## 0.1.2

### Patch Changes

- Move enum into validator, and bump package versions

## 0.1.1

### Patch Changes

- bump package versions to latest
