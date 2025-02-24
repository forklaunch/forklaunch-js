# @forklaunch/validator

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
