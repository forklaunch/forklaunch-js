---
title: Adding Projects - Libraries
category: Guides
description: Learn how to add and configure libraries in your application.
---

## Adding a Library

To add a library to your application, run the following command:

<CodeTabs type="instantiate">
  <Tab title="init">

  ```bash
  forklaunch init library
  ```

  </Tab>
  <Tab title="add">

  ```bash
  forklaunch add library
  ```
  
  </Tab>
</CodeTabs>

This adds a new library to your application, with a simple `lib.ts` file that contains some library logic.

Since this is so open-ended, it is expected that there will be a lot of custom logic added to the library.

### Project Structure

A minimal library will have the following structure:

```bash
.
├── eslint.config.mjs -> ../eslint.config.mjs # symlinked from parent for consistency
├── index.ts
├── lib.ts # the library logic
├── package.json
├── tsconfig.json
└── vitest.config.ts -> ../vitest.config.ts # symlinked from parent for consistency
```

### Next Steps

After creating a library:
1. Define your library's public API in `index.ts`
2. Implement your core functionality in `lib.ts`
3. Add proper TypeScript types and documentation
4. Set up unit tests
5. Configure build settings in `package.json`
6. Add README documentation

### Common Issues

1. **Circular Dependencies**: Ensure your library doesn't create circular dependencies with other projects
2. **Build Configuration**: Verify your library is properly compiled for consumption
3. **Type Definitions**: Check that TypeScript types are properly exported
4. **Package Versioning**: Maintain proper versioning for internal dependencies

### Best Practices

1. Keep the API surface small and focused
2. Write comprehensive documentation
3. Include TypeScript types for all exports
4. Follow semantic versioning
5. Write thorough unit tests
6. Minimize external dependencies
7. Make the library tree-shakeable when possible
8. Use proper error handling and validation
