---
title: Adding Projects - Modules
category: Guides
description: Learn how to add and configure modules in your application.
---

## Adding a Module

To add a module to your application, run the following command:

<CodeTabs type="instantiate">
  <Tab title="init">

  ```bash
  forklaunch init module
  ```

  </Tab>
  <Tab title="add">

  ```bash
  forklaunch add module
  ```

  </Tab>
</CodeTabs>

This adds a new module to your application. Modules are pre-built libraries or integrations that help you accelerate development and add functionality to your stack.

`ForkLaunch` will automatically add the module to your workspace and register any necessary scripts.

By default, you will not need to run any scripts to get going, but if your module depends on external services or configuration, you may need to run `build` and `install` scripts from the top level of the application.

### Choices

| Component    | Valid Options              | Description                           | How to Change                                  |
| :----------- | :------------------------- | :------------------------------------ | :---------------------------------------------- |
| _ModuleType_ | e.g. `auth`, `billing`     | The module to add to your application | Change via the module selection during command  |

### Project Structure

A minimal module will have the following structure:

```bash
.
├── index.ts            # module entry point
├── lib.ts              # module logic or exports
├── package.json
├── tsconfig.json
├── eslint.config.mjs -> ../eslint.config.mjs # symlinked from parent for consistency
└── vitest.config.ts -> ../vitest.config.ts   # symlinked from parent for consistency
```

### Environment Variables

Some modules may require environment variables:
```bash
# Example:
MODULE_API_KEY=your_module_api_key
```
Check the module's documentation for required variables.

### Next Steps

After creating a module:
1. Review the module's documentation for usage details
2. Import the module in your service, worker, or library where needed
3. Configure any required environment variables
4. Extend or customize the module if necessary
5. Write tests for your integration

### Common Issues

1. **Missing Configuration**: Ensure all required environment variables are set
2. **Dependency Errors**: Run `npm install` if you see missing dependency errors
3. **Version Conflicts**: Make sure your module is compatible with your application version

### Best Practices

1. Use modules to share common logic or integrations across projects
2. Keep modules decoupled from specific business logic
3. Document the public API surface of your modules
4. Write comprehensive tests for any module extensions
5. Update modules regularly to receive bug fixes and improvements
