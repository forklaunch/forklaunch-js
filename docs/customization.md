---
title: Customizations
category: References
description: Learn how to customize your ForkLaunch application's behavior.
---

## Overview

ForkLaunch provides several levels of customization for core features like documentation, authorization, and validation.

## Documentation

### Scalar UI Customization
When using the default Scalar documentation UI, you can customize:
```typescript
const docsConfiguration = {
  theme: {
    colors: {
      primary: '#4F46E5',
      secondary: '#7C3AED'
    },
    logo: '/path/to/logo.svg'
  },
  layout: {
    hideTryIt: false,
    hideExamples: false
  }
}

const app = forkLaunchApplication({
  ...,
  docsConfiguration
})
```

## Authorization

Authorization can be configured at multiple levels:

### Application Level
```typescript
const app = forkLaunchApplication({
  ...,
  auth: {
    ...
  }
})
```

### Router Level
```typescript
const router = forkLaunchRouter('/api', {
  ...,
  auth: {
    ...
  }
})
```

### Endpoint Level
```typescript
router.get('/path', {
  ...,
  auth: {
    ...
  }
}, handler)
```

## Validation

Control validation behavior at different levels:

### Application Level
```typescript
const app = forkLaunchApplication({
  ...,
  validation: {
    request: 'error',
    response: 'warning'
  }
})
```

### Router Level
```typescript
const router = forkLaunchRouter('/api', {
  ...,
  validation: {
    request: 'warning',
    response: 'none'
  }
})
```

### Endpoint Level
```typescript
router.post('/path', {
  ...,
  validation: {
    request: 'error',
    response: 'warning'
  }
}, handler)
```

## Best Practices

1. Configure auth at the highest appropriate level
2. Use stricter validation where possible

## Default Values

If not specified, ForkLaunch uses these defaults:
- Documentation UI: Scalar
- Auth: none
- Validation: 'error' for both request and response