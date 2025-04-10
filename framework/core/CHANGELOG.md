# @forklaunch/core

## 0.6.5

### Patch Changes

- Service schema validators now accept keyword argument options for passing down to schemas

## 0.6.4

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.12

## 0.6.3

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.11

## 0.6.2

### Patch Changes

- Update package versions
- Updated dependencies
  - @forklaunch/validator@0.4.10
  - @forklaunch/common@0.2.6

## 0.6.1

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.9

## 0.6.0

### Minor Changes

- Syntactic QOL improvements (validator zod args, config injector, core utilities, test utilities, etc.)

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.8
  - @forklaunch/common@0.2.5

## 0.5.6

### Patch Changes

- Increase package dependency versions
- Updated dependencies
  - @forklaunch/validator@0.4.7
  - @forklaunch/common@0.2.4

## 0.5.5

### Patch Changes

- Enables docs configuration to be set by caller and sends parsing error information to client if api parsing fails

## 0.5.4

### Patch Changes

- Allow for constructed singletons in config validation and add latency metric for OpenTelemetryCollector (+small tweaks)

## 0.5.3

### Patch Changes

- Reintroduce request to auth and fix typing issues

## 0.5.2

### Patch Changes

- Constrain the auth request to only include discovered parameters for simplicity. Bump package versions.
- Updated dependencies
  - @forklaunch/validator@0.4.6
  - @forklaunch/common@0.2.3

## 0.5.1

### Patch Changes

- bump package versions
- Updated dependencies
  - @forklaunch/validator@0.4.5
  - @forklaunch/common@0.2.2

## 0.5.0

### Minor Changes

- Add support for built in monitoring

## 0.4.0

### Minor Changes

- Adds nascent support for OpenTelemetry (logs, metrics, traces)

## 0.3.6

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.4

## 0.3.5

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.2.1
  - @forklaunch/validator@0.4.3

## 0.3.4

### Patch Changes

- fix config injector ergonomics to be much nicer
- Updated dependencies
  - @forklaunch/validator@0.4.2

## 0.3.3

### Patch Changes

- Create an actual type from valid config injector since splay dropped methods

## 0.3.2

### Patch Changes

- Change return type of validateConfigSingletons to ValidConfigInjector to ensure validity

## 0.3.1

### Patch Changes

- Validator parse methods now return errors, and config injector now validates class based or schematic singletons, returning a ValidConfigInjector object
- Updated dependencies
  - @forklaunch/validator@0.4.1

## 0.3.0

### Minor Changes

- Changed build from tsc to tsup to accommodate cjs and esm consumers

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.0
  - @forklaunch/common@0.2.0

## 0.2.37

### Patch Changes

- Remove uuid constraint for primarykey

## 0.2.36

### Patch Changes

- Include a mongo base entity for use with mongodb backends

## 0.2.35

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.14
  - @forklaunch/validator@0.3.13

## 0.2.34

### Patch Changes

- multiple improvements for config injector class

## 0.2.33

### Patch Changes

- Add schema check to validator interface, and for validating configurations, check if value is a schema and return any errors with pathing
- Updated dependencies
  - @forklaunch/validator@0.3.12

## 0.2.32

### Patch Changes

- append subrouters to router to enable openapi spec

## 0.2.31

### Patch Changes

- jose export for bun compatibility

## 0.2.30

### Patch Changes

- 59d4bfd: Upgrade core package to be more compatible with bun

## 0.2.29

### Patch Changes

- Move enum into validator, and bump package versions
- Updated dependencies
  - @forklaunch/common@0.1.13
  - @forklaunch/validator@0.3.11

## 0.2.28

### Patch Changes

- bump package versions to latest
- Updated dependencies
  - @forklaunch/validator@0.3.10
  - @forklaunch/common@0.1.12

## 0.2.27

### Patch Changes

- Adds utilities for removing trailing slashes and checking if a top level property should be optional if all children are optional. Additionally allows Application classes to use all Router methods as an extension.
- Updated dependencies
  - @forklaunch/common@0.1.11
  - @forklaunch/validator@0.3.9

## 0.2.26

### Patch Changes

- Adds utility type for controllers, utilities for constructing cache keys, and ensures that router registrations match the path of the typed handler

## 0.2.25

### Patch Changes

- includes wrapper functions for better ergonomics for typedHandler functions (get, delete\_, options, head, trace, post, patch, put, middleware)

## 0.2.24

### Patch Changes

- Improve typing on dto mapper methods

## 0.2.23

### Patch Changes

- Made TtlCacheRecord generic and improved ergonomics for dtoMappers (inline and more appropriate names)

## 0.2.22

### Patch Changes

- scopedResolver in ConfigInjector should create a new scope if not supplied with one

## 0.2.21

### Patch Changes

- updates config injector with scopedResolver for nicer handling when used with routers

## 0.2.20

### Patch Changes

- last version not built

## 0.2.19

### Patch Changes

- loosen constraint on isExpressLikeSchemaHandler

## 0.2.18

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.10
  - @forklaunch/validator@0.3.8

## 0.2.17

### Patch Changes

- Remove unnecessary flatten

## 0.2.16

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.9
  - @forklaunch/validator@0.3.7

## 0.2.15

### Patch Changes

- Add ApiClient top level type for use with exporting live type routers

## 0.2.14

### Patch Changes

- Improve error messages

## 0.2.13

### Patch Changes

- Improve controller handler error message

## 0.2.12

### Patch Changes

- Removing es-module type, due to incompatibility with downstream dependencies.
- Updated dependencies
  - @forklaunch/validator@0.3.6
  - @forklaunch/common@0.1.8
