# @forklaunch/common

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
