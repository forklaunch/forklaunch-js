# @forklaunch/core

## 0.9.9

### Patch Changes

- update package dependencies
- Updated dependencies
  - @forklaunch/validator@0.6.9
  - @forklaunch/common@0.3.9

## 0.9.8

### Patch Changes

- patch return types for create and update static methods

## 0.9.7

### Patch Changes

- Add back sensible entity utilities

## 0.9.6

### Patch Changes

- fix internal type

## 0.9.5

### Patch Changes

- Update internaldtomapper type

## 0.9.4

### Patch Changes

- Update request mapper signature types

## 0.9.3

### Patch Changes

- package conflict resolution
- fix minor buffer bugs and update subdependencies
- Updated dependencies
- Updated dependencies
  - @forklaunch/common@0.3.8
  - @forklaunch/validator@0.6.8

## 0.9.2

### Patch Changes

- Internal type adjustment

## 0.9.1

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.6.7
  - @forklaunch/common@0.3.7

## 0.9.0

### Minor Changes

- Mapper now only accepts async mapping methods, due to nature of entity retrieval

## 0.8.8

### Patch Changes

- Move getEnvVar into common package and allow for cors options during application instantiation
- Updated dependencies
  - @forklaunch/common@0.3.6
  - @forklaunch/validator@0.6.6

## 0.8.7

### Patch Changes

- increase package dependency versions
- Updated dependencies
  - @forklaunch/validator@0.6.5
  - @forklaunch/common@0.3.5

## 0.8.6

### Patch Changes

- simplify controller types

## 0.8.5

### Patch Changes

- Better file based ergonomics in validator, simplification of types and all but validator is checked by tsgo
- Updated dependencies
  - @forklaunch/validator@0.6.4
  - @forklaunch/common@0.3.4

## 0.8.4

### Patch Changes

- increase package versions
- Updated dependencies
  - @forklaunch/validator@0.6.3
  - @forklaunch/common@0.3.3

## 0.8.3

### Patch Changes

- split out infrastructure into separate packages

## 0.8.2

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.2
  - @forklaunch/validator@0.6.2

## 0.8.1

### Patch Changes

- Add additional options to framework to instantiate applications and routers
- Updated dependencies
  - @forklaunch/validator@0.6.1
  - @forklaunch/common@0.3.1

## 0.8.0

### Minor Changes

- Added support for content types in request/response and fixed edge cases in validator

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.3.0
  - @forklaunch/validator@0.6.0

## 0.7.4

### Patch Changes

- Increase package versions
- Updated dependencies
  - @forklaunch/validator@0.5.4
  - @forklaunch/common@0.2.11

## 0.7.3

### Patch Changes

- stringify logger arguments
- Updated dependencies
  - @forklaunch/validator@0.5.3
  - @forklaunch/common@0.2.10

## 0.7.2

### Patch Changes

- Various bugfixes, including deduplicated http metrics, multiple constructed singleton loading and leaking empty enqueued redis records"
- Updated dependencies
  - @forklaunch/validator@0.5.2
  - @forklaunch/common@0.2.9

## 0.7.1

### Patch Changes

- Upgrade package versions
- Updated dependencies
  - @forklaunch/validator@0.5.1
  - @forklaunch/common@0.2.8

## 0.7.0

### Minor Changes

- Added persistence into core package, better documentation and more validator utilities

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.5.0
  - @forklaunch/common@0.2.7

## 0.6.6

### Patch Changes

- Change name from dto mapper => mapper

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

- Made TtlCacheRecord generic and improved ergonomics for mappers (inline and more appropriate names)

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
