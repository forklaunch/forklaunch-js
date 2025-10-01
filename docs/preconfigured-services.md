---
title: Preconfigured Services
category: References
description: Learn about ForkLaunch's pre-built service modules.
---

## Overview

ForkLaunch provides production-ready service modules that handle common application needs. These modules:

- Can be added during initial setup or later
- Ship with opaque implementations for easy updates
- Provide base functionality for extension
- Support ejection into your codebase via `forklaunch eject`

## Available Services

### Identity and Access Management (IAM)
Authorization service that handles:
- User management  
- Role-based access control
- Session management
- Permission management
- Organization management

Authentication implementations:
- **IAM Base**: Foundational authentication with JWT support and custom auth methods
- **IAM Better Auth**: Integration with BetterAuth (https://www.better-auth.com/) for advanced authentication features

[View IAM API Documentation →](https://forklaunch.com/iam-api/docs)

### Billing
Base billing infrastructure service that manages:
- Payment tracking
- Plan creation and management
- Checkout session creation
- Subscription management
- Billing portal access
- Payment link generation

Payment processor implementations:
- **Billing Base**: Foundational billing logic with extensible payment provider interface
- **Billing Stripe**: Full Stripe integration with webhook handling and complete payment flow

[View Billing API Documentation →](https://forklaunch.com/billing-api/docs)

### Monitoring
Observability and monitoring service that provides:
- OpenTelemetry integration
- Metrics collection with Prometheus
- Distributed tracing with Tempo  
- Grafana dashboards and provisioning
- Performance monitoring and alerting

### Universal SDK
Type-safe SDK generator that creates:
- Client libraries for consuming ForkLaunch APIs
- Cross-platform compatibility (Node.js, Browser, React Native)
- Automatic type generation from OpenAPI specs
- Built-in error handling and retry logic

### Core
Shared utilities and base classes:
- Base entity classes for SQL and NoSQL databases
- Common interfaces and types
- Persistence layer abstractions
- Framework integration utilities

### Ejected Implementation
For full customization, eject the service into your codebase:
```bash
forklaunch eject <service>
```

## Best Practices

1. Start with opaque implementations for faster development
2. Extend base services rather than ejecting when possible
3. Only eject when significant customization is needed
4. Keep custom logic separate from base functionality

## Coming Soon

- Onboarding service: for onboarding users smoothly and seamlessly

More preconfigured services are in development. Follow our [roadmap](/roadmap) for updates.
