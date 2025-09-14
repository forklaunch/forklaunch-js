---
title: Framework - Telemetry
category: References
description: Reference for OpenTelemetry integration in ForkLaunch.
---

## Overview

ForkLaunch provides comprehensive observability through the `@forklaunch/core` package's OpenTelemetry integration, automatically instrumenting your applications with:

- **Built-in OpenTelemetry collector** (`OpenTelemetryCollector`) - Ready-to-use telemetry pipeline
- **Pino logger integration** - High-performance structured logging
- **Automatic metrics collection** - HTTP request/response metrics and custom business metrics
- **Context-aware instrumentation** - Automatic correlation IDs and request tracing
- **Multiple export formats** - OTLP HTTP, Prometheus, and custom exporters

The telemetry system is built into every ForkLaunch application and integrates seamlessly with:
- **HTTP frameworks** for automatic request/response instrumentation
- **Error handling** for correlation ID propagation
- **Authorization** for security event tracking

## Package Structure

### Core Telemetry Components
- **`OpenTelemetryCollector`** - Main telemetry collector class
- **`MetricsDefinition`** - Type-safe metrics configuration
- **`PinoLogger`** - Structured logging with correlation IDs
- **Telemetry constants** - Standard metric names and labels

## Usage

### Creating OpenTelemetry Collector

```typescript
import { createOpenTelemetryCollector } from '@forklaunch/core/http';

// Create collector with default configuration
const openTelemetryCollector = createOpenTelemetryCollector();

// Use with HTTP frameworks
const app = forklaunchExpress(
  schemaValidator,
  openTelemetryCollector,
  {
    docs: { enabled: true }
  }
);
```

### Custom Metrics Definition

```typescript
import { MetricsDefinition } from '@forklaunch/core/http';

const customMetrics: MetricsDefinition = {
  userRegistrations: {
    type: 'counter',
    name: 'user_registrations_total',
    description: 'Total number of user registrations',
    labels: ['source', 'plan']
  },
  apiLatency: {
    type: 'histogram',
    name: 'api_request_duration_ms',
    description: 'API request duration in milliseconds',
    labels: ['method', 'route', 'status'],
    buckets: [10, 50, 100, 500, 1000, 5000]
  }
};
```

### Structured Logging

```typescript
import { PinoLogger } from '@forklaunch/core/http';

// Logger automatically includes correlation IDs
const logger = new PinoLogger();

// Use in your handlers
userRouter.post('/', {
  name: 'createUser',
  body: userSchema,
  responses: { 201: userSchema }
}, async (req, res) => {
  logger.info('Creating user', { 
    userId: req.body.id,
    email: req.body.email 
  });
  
  // Your handler logic
});
```

## Default Setup

Your application automatically sends:
- **Traces** to OpenTelemetry collector with full request lifecycle
- **Metrics** to Prometheus for performance monitoring
- **Logs** to structured JSON format with correlation IDs

Access your observability dashboard at `http://localhost:3000`

## Configuration

### Environment Variables
```bash
# OpenTelemetry endpoint configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Service name for telemetry identification
OTEL_SERVICE_NAME=my-service

# Optional: Additional service attributes
OTEL_SERVICE_VERSION=1.0.0
OTEL_DEPLOYMENT_ENVIRONMENT=production
```

### Custom Metrics

Add custom business metrics in `monitoring/metrics.ts`:
```typescript
// monitoring/metrics.ts
export const metricsDefinition = {
  // HTTP-related metrics
  requestDuration: {
    type: 'histogram',
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    buckets: [1, 5, 15, 50, 100, 500, 1000]
  },
  
  // Business metrics  
  userRegistrations: {
    type: 'counter',
    name: 'user_registrations_total',
    help: 'Total number of user registrations'
  },
  
  activeConnections: {
    type: 'gauge',
    name: 'active_connections',
    help: 'Number of active WebSocket connections'
  }
}
```

## Framework Integration

### Automatic HTTP Instrumentation
```typescript
// All HTTP endpoints are automatically instrumented
app.get('/users/:id', {
  name: 'Get User',
  // Traces include: request/response, duration, errors
  // Metrics include: request count, response codes, latency
}, handler);
```

### Authorization Events
```typescript
// Authorization failures are automatically logged and traced
const contractDetails = {
  auth: {
    method: 'jwt',
    // Auth events appear in traces and logs with correlation IDs
  }
}
```

### Error Correlation
```typescript
// Errors are automatically linked to traces via correlation IDs
throw new Error('Database connection failed');
// Shows up in: traces, logs, and metrics with full context
```

## Included Dashboards

### Application Overview
- **Request rates, errors, and durations** - Core SLI monitoring
- **Service health metrics** - Uptime and availability tracking
- **Error rates and types** - Error categorization and trends
- **Resource utilization** - CPU, memory, and dependency usage

### RED Metrics Dashboard
- **(R)ate** - Request throughput and trends
- **(E)rror** - Error rates, status codes, and error types
- **(D)uration** - Response time percentiles and latency distribution

### Infrastructure Dashboard
- Database query performance and connection pools
- External service call latencies and success rates
- Memory usage and garbage collection metrics
- Thread pool and async operation monitoring

## Directory Structure

```bash
monitoring/
├── grafana-provisioning/   # Dashboard and datasource configs
│   ├── dashboards/        # Pre-built dashboard definitions
│   └── datasources/       # Prometheus, Loki, Tempo configs
├── metrics.ts             # Custom metrics definitions
├── otel-collector-config.yaml
├── prometheus.yaml
└── tempo.yaml
```

## Best Practices

1. **Use semantic naming for custom metrics** - Follow OpenTelemetry conventions
2. **Add business-relevant metrics to track KPIs** - Beyond technical metrics
3. **Keep dashboard queries efficient** - Avoid expensive aggregations
4. **Set appropriate alert thresholds** - Based on SLA requirements
5. **Leverage correlation IDs** - Connect logs, traces, and metrics
6. **Monitor resource usage** - Set up alerts for memory/CPU thresholds

## Production Considerations

### Performance Impact
- Telemetry adds ~1-3% overhead in typical applications
- Sampling can be configured to reduce trace volume
- Metrics collection is lightweight and always-on

### Data Retention
```yaml
# Configure retention in prometheus.yaml
global:
  retention: 30d  # Adjust based on storage capacity
```

## Default Instrumentation

ForkLaunch automatically instruments:
- **HTTP requests and responses** - Full request lifecycle tracing
- **Database queries** - Query performance and connection metrics
- **Cache operations** - Hit rates, latency, and error tracking
- **External service calls** - Dependency monitoring and circuit breaker status
- **Runtime metrics** - CPU, memory, garbage collection, event loop lag

## Related Documentation

- **[Error Handling](/docs/framework/error-handling.md)** - Correlation IDs and error tracking
- **[Authorization](/docs/framework/authorization.md)** - Authentication event logging
- **[HTTP Frameworks](/docs/framework/http.md)** - Automatic request instrumentation
- **[Config Injector](/docs/framework/config.md)** - Dependency injection observability