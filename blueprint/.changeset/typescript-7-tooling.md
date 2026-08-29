---
---

Move the workspace to TypeScript 7 and standardize the app templates.

Deliberately no release. What changed in the publishable packages is the
`typescript` devDependency and the `build` script, and neither reaches a
consumer: devDependencies are not installed by anyone depending on these
packages, and the build script only runs here. Publishing nineteen packages
whose tarball contents are byte-identical would spend version numbers to say
nothing.

The rest of the change is confined to the blueprint-* templates, which are
scaffolding rather than artifacts — they are consumed as workspace members by
generated applications and as source by the CLI, never installed from a
registry. They are now marked private, which is what actually prevents a
publish, and their vestigial `publishConfig.access` has been removed since it
contradicted that and was never read.
