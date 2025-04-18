# @forklaunch/hyper-express

## 0.4.6

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.6.6

## 0.4.5

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.6.5

## 0.4.4

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.12
  - @forklaunch/core@0.6.4

## 0.4.3

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.11
  - @forklaunch/core@0.6.3

## 0.4.2

### Patch Changes

- Update package versions
- Updated dependencies
  - @forklaunch/validator@0.4.10
  - @forklaunch/common@0.2.6
  - @forklaunch/core@0.6.2

## 0.4.1

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.9
  - @forklaunch/core@0.6.1

## 0.4.0

### Minor Changes

- Syntactic QOL improvements (validator zod args, config injector, core utilities, test utilities, etc.)

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.6.0
  - @forklaunch/validator@0.4.8
  - @forklaunch/common@0.2.5

## 0.3.7

### Patch Changes

- Increase package dependency versions
- Updated dependencies
  - @forklaunch/validator@0.4.7
  - @forklaunch/common@0.2.4
  - @forklaunch/core@0.5.6

## 0.3.6

### Patch Changes

- Enables docs configuration to be set by caller and sends parsing error information to client if api parsing fails
- Updated dependencies
  - @forklaunch/core@0.5.5

## 0.3.5

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.5.4

## 0.3.4

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.5.3

## 0.3.3

### Patch Changes

- Constrain the auth request to only include discovered parameters for simplicity. Bump package versions.
- Updated dependencies
  - @forklaunch/validator@0.4.6
  - @forklaunch/common@0.2.3
  - @forklaunch/core@0.5.2

## 0.3.2

### Patch Changes

- bump package versions
- Updated dependencies
  - @forklaunch/validator@0.4.5
  - @forklaunch/common@0.2.2
  - @forklaunch/core@0.5.1

## 0.3.1

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.5.0

## 0.3.0

### Minor Changes

- Adds nascent support for OpenTelemetry (logs, metrics, traces)

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.4.0

## 0.2.9

### Patch Changes

- bump http frameworks to support docs path

## 0.2.8

### Patch Changes

- Fixes issue with pathing for docs path

## 0.2.7

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.4
  - @forklaunch/core@0.3.6

## 0.2.6

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.2.1
  - @forklaunch/core@0.3.5
  - @forklaunch/validator@0.4.3

## 0.2.5

### Patch Changes

- fix config injector ergonomics to be much nicer
- Updated dependencies
  - @forklaunch/validator@0.4.2
  - @forklaunch/core@0.3.4

## 0.2.4

### Patch Changes

- Create an actual type from valid config injector since splay dropped methods
- Updated dependencies
  - @forklaunch/core@0.3.3

## 0.2.3

### Patch Changes

- Change return type of validateConfigSingletons to ValidConfigInjector to ensure validity
- Updated dependencies
  - @forklaunch/core@0.3.2

## 0.2.2

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.1
  - @forklaunch/core@0.3.1

## 0.2.1

### Patch Changes

- Uses fork, due to custom setters necessary for parsing

## 0.2.0

### Minor Changes

- Changed build from tsc to tsup to accommodate cjs and esm consumers

### Patch Changes

- Updated dependencies
  - @forklaunch/validator@0.4.0
  - @forklaunch/common@0.2.0
  - @forklaunch/core@0.3.0

## 0.1.33

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.37

## 0.1.32

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.36

## 0.1.31

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.14
  - @forklaunch/core@0.2.35
  - @forklaunch/validator@0.3.13

## 0.1.30

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.34

## 0.1.29

### Patch Changes

- Add schema check to validator interface, and for validating configurations, check if value is a schema and return any errors with pathing
- Updated dependencies
  - @forklaunch/validator@0.3.12
  - @forklaunch/core@0.2.33

## 0.1.28

### Patch Changes

- append subrouters to router to enable openapi spec
- Updated dependencies
  - @forklaunch/core@0.2.32

## 0.1.27

### Patch Changes

- jose export for bun compatibility
- Updated dependencies
  - @forklaunch/core@0.2.31

## 0.1.26

### Patch Changes

- Updated dependencies [59d4bfd]
  - @forklaunch/core@0.2.30

## 0.1.25

### Patch Changes

- Move enum into validator, and bump package versions
- Updated dependencies
  - @forklaunch/common@0.1.13
  - @forklaunch/core@0.2.29
  - @forklaunch/validator@0.3.11

## 0.1.24

### Patch Changes

- bump package versions to latest
- Updated dependencies
  - @forklaunch/validator@0.3.10
  - @forklaunch/common@0.1.12
  - @forklaunch/core@0.2.28

## 0.1.23

### Patch Changes

- Adds utilities for removing trailing slashes and checking if a top level property should be optional if all children are optional. Additionally allows Application classes to use all Router methods as an extension.
- Updated dependencies
  - @forklaunch/common@0.1.11
  - @forklaunch/core@0.2.27
  - @forklaunch/validator@0.3.9

## 0.1.22

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.26

## 0.1.21

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.25

## 0.1.20

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.24

## 0.1.19

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.23

## 0.1.18

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.22

## 0.1.17

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.21

## 0.1.16

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.20

## 0.1.15

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.19

## 0.1.14

### Patch Changes

- export types from packages

## 0.1.13

### Patch Changes

- adds proper exports to packages
- Updated dependencies
  - @forklaunch/common@0.1.10
  - @forklaunch/core@0.2.18
  - @forklaunch/validator@0.3.8

## 0.1.12

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.17

## 0.1.11

### Patch Changes

- Updated dependencies
  - @forklaunch/common@0.1.9
  - @forklaunch/core@0.2.16
  - @forklaunch/validator@0.3.7

## 0.1.10

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.15

## 0.1.9

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.14

## 0.1.8

### Patch Changes

- Updated dependencies
  - @forklaunch/core@0.2.13

## 0.1.7

### Patch Changes

- Removing es-module type, due to incompatibility with downstream dependencies.
- Updated dependencies
  - @forklaunch/validator@0.3.6
  - @forklaunch/common@0.1.8
  - @forklaunch/core@0.2.12
