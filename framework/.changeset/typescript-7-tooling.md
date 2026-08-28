---
---

Move the framework workspace to TypeScript 7.

Deliberately no release. The change is the `typescript` devDependency, the
removal of `@typescript/native-preview`, and `tsgo` becoming `tsc` in build
scripts. None of that reaches a consumer — devDependencies are not installed by
anyone depending on these packages, and the build scripts only run here. The
emitted output is unchanged, so publishing would spend version numbers on
byte-identical tarballs.
