# @forklaunch/core

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
