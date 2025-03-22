---
title: Framework - HTTP Frameworks
category: References
description: Reference for using HTTP Frameworks in ForkLaunch.
---

## Overview

`ForkLaunch` is built directly on top of the `express` syntax, allowing for a near drop-in replacement for your express applications. The net new difference is the requirement of a `ContractDetails` object, which enables:
- Automatic schema validation and type coercion
- Automatic API documentation generation
- Built-in telemetry collection
- Standardized error handling

By default, `ForkLaunch` ships two flavors of HTTP frameworks:

- `@forklaunch/express`: Compatible with `express.js` 4.0. As close to the standard framework in `node` development. Compatible with `bun` and `node` 18+.
- `@forklaunch/hyper-express`: A `uwebsockets`-based framework that is faster and more efficient than `express.js` but still maintains a similar API.

There are plans to support `express 5.0` as well as part of a separate package.

## Application

`forklaunchApplication` virtually acts as a drop-in replacement for `express.Application`, with one additional initialization argument:

```typescript
function forkLaunchApplication(initArgs: {
  /**
   * A validator instance for schema validation and type coercion.
   * Typically exported from core/registrations.ts.
   */
  schemaValidator: SchemaValidator
  /**
   * OpenTelemetry collector instance for observability.
   * Can be constructed from @forklaunch/core/telemetry
   */
  openTelemetryCollector: OpenTelemetryCollector
  /**
   * Configuration for customizing auto-generated API documentation styling and options.
   */
  docsConfiguration?: DocsConfiguration
  /**
   * Configuration for validation across all APIs
   */ 
  validation: ValidationConfiguration
  /**
   * Configuration for auth across all APIs
   */
  auth?: AuthConfiguration
}) {
    ...
}

// Example instantiation
const app = forkLaunchApplication({
  schemaValidator: schemaValidator,
  openTelemetryCollector: openTelemetryCollector,
})
```

## Router

`forklaunchRouter` virtually acts as a drop-in replacement for `express.Router`, with one additional initialization argument:

```typescript
function forklaunchRouter(
  /**
   * The base path for all routes registered with the router
   */
  basePath: `/${string}`,
  initArgs: {
    /**
     * OpenTelemetry collector instance for observability.
     * Can be constructed from @forklaunch/core/telemetry
     */
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>
  }
) {
    ...
}

// Example instantiation
const router = forklaunchRouter(
  '/router-path',
  openTelemetryCollector,
)
```

## Handlers

Handlers virtually act as drop-in replacements for `express` handlers, with one or two additional arguments. This means you will be able to use existing handlers and middleware.

### Contract Details

With any handler registration, there now is a required `ContractDetails` type, which captures schema metadata that will automatically validate and coerce before executing handler logic:

```typescript
// These type definitions are simplified for demonstration purposes
type ContractDetails = HttpContractDetails | PathParamContractDetails | MiddlewareContractDetails

// This is simplified for documentation purposes
type PathParamContractDetails = {
  /** Name of the contract */
  readonly name: string;
  /** Summary of the contract */
  readonly summary: string;
  /** Response schemas for the contract */
  readonly responses: ResponseSchemas;
  /** Optional path params for the contract */
  readonly params?: ParamSchemas;
  /** Optional request headers for the contract */
  readonly requestHeaders?: ReqHeadersSchema;
  /** Optional response headers for the contract */
  readonly responseHeaders?: ResHeadersSchema;
  /** Optional query schemas for the contract */
  readonly query?: QuerySchema;
  /** Optional authentication details for the contract */
  readonly auth?: SchemaAuthMethods
  /** Endpoint level options */
  readonly options?: {
    readonly requestValidation: 'error' | 'warning' | 'none';
    readonly responseValidation: 'error' | 'warning' | 'none';
  };
}

type HttpContractDetails = PathParamContractDetails & {
  /** Body Schemas */
  readonly body: BodySchemas; 
}

type MiddlewareContractDetails = Partial<HttpContractDetails>
```

### Registering Handlers

There are two main ways to instantiate a route on an application or router, resembling common `express` patterns:

- Controller pattern: directly instantiate handlers inline when registering a route with a router/application

```typescript
interface Router {
    // Simplified definition
    function get(path: `/${string}`, contractDetails: PathParamContractDetails, ...handlers: ExpressLikeHandler[]) {
        ...
    };
    function post(path: `/${string}`, contractDetails: HttpContractDetails, ...handlers: ExpressLikeHandler[]) {
        ...
    };
    function use(path: `/${string}`, contractDetails: MiddlewareContractDetails, ...handlers: ExpressLikeHandler[]) {
        ...
    }
    ...
}

// example instantiation
router.get('/get-path', {
  name: 'Get Request',
  summary: 'a simple get request'
  responses: {
    200: {
      success: boolean
    }
  }
}, (req, res) => {
  res.status(200).json({
    success: true
  })
})
```

- Controller/Route pattern

```typescript
function get(schemaValidator: SchemaValidator, path?: `/${string}`, contractDetails: PathParamContractDetails, handler: ExpressLikeHandler[]) {
    ...
};
function post(schemaValidator: SchemaValidator, path?: `/${string}`, contractDetails: HttpContractDetails, handlers: ExpressLikeHandler[]) {
    ...
};
function use(schemaValidator: SchemaValidator, path?: `/${string}`, contractDetails: MiddlewareContractDetails, handlers: ExpressLikeHandler[]) {
    ...
}

// example instantiation
const standaloneController = get(SchemaValidator(), '/get-path', {
  name: 'Get Request',
  summary: 'a simple get request'
  responses: {
    200: {
      success: boolean
    }
  }
}, (req, res) => {
  res.status(200).json({
    success: true
  })
})
router.get('/get-path')
```

### Testing and Local Invocation

When registering a route, the return type is a live-typed function. This allows for testing or local invocation. It will run only the handlers specified on the route and return a result.

```typescript
// example instantiations
const liveFunction = router.post('/post-path', {
    name: 'post example',
    summary: 'A random post example',
    responses: {
        200: {
            someParam: string
        },
        418: literal("I'm a teapot"),
        500: number,
    },
    body: {
        someBodyParam: string,
        someDeeplyNestedBodyParam: {
            layerOne: {
                layerTwo: {
                    layerThree: union(string, boolean, number)
                }
            }
        }
    }
}, (req, res) => {
    // fully typed req and res objects based on contract detail definitions
    const a = req.body.someBodyParam.substring(0, 3);

    res.status(200).json({
      someParam: a
    })
});

// The live function can be invoked locally for testing purposes, using a fetch like syntax
const response = liveFunction('/post-path', {
  body: {
    someBodyParam: 'some string',
    someDeeplyNestedBodyParam: {
      layerOne: {
        layerTwo: {
          layerThree: true
        }
      }
    }
  }
});

// all valid typings and results
switch (response.statusCode) {
    case 200:
        // string return type
        console.log(res.content.someParam);
        break;
    case 418:
        // I'm a teapot
        console.log(res.content);
    case 500:
        // number return type
        console.log(res.content * 5)
}
```

### Best Practices

1. Define one API per request type
2. Use proper HTTP methods for operations
3. Keep handlers focused and simple
4. Use live functions for testing

### Performance Considerations

1. Choose the appropriate framework (`express` vs `hyper-express`) based on your needs
2. Configure validation levels in ContractDetails options when needed