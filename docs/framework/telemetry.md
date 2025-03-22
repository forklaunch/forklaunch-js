---
title: Framework - Telemetry
category: References
description: Reference for OpenTelemetry integration in ForkLaunch.
---

## Overview

ForkLaunch provides built-in observability through OpenTelemetry integration. By default, it ships with:
- Preconfigured OpenTelemetry collector
- LGTM stack (Loki, Grafana, Tempo, Mimir)
- Ready-to-use Grafana dashboards
- Context-aware instrumentation

## Default Setup

Your application automatically sends:
- Traces to OpenTelemetry collector
- Metrics to Prometheus
- Logs to Loki

Access your metrics at `http://localhost:3000`

## Configuration

### Environment Variables
```bash
# OpenTelemetry endpoint configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Service name for telemetry identification
OTEL_SERVICE_NAME=my-service
```

### Custom Metrics

Add custom metrics in `monitoring/metrics.ts`:
```typescript
// monitoring/metrics.ts
export const metricsDefinition = {
  requestDuration: {
    type: 'histogram',
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms'
  }
}
```

## Included Dashboards

### Application Overview
- Request rates, errors, and durations
- Service health metrics
- Error rates and types
- Resource utilization

### RED Metrics
- (R)ate - Request throughput
- (E)rror - Error rates and types
- (D)uration - Response time metrics

## Directory Structure

```bash
monitoring/
├── grafana-provisioning/   # Dashboard and datasource configs
├── metrics.ts             # Custom metrics definitions
├── otel-collector-config.yaml
├── prometheus.yaml
└── tempo.yaml
```

## Best Practices

1. Use semantic naming for custom metrics
2. Add business-relevant metrics to track KPIs
3. Keep dashboard queries efficient
4. Set appropriate alert thresholds

## Default Instrumentation

ForkLaunch automatically instruments:
- HTTP requests and responses
- Full trace call stack
- Managed deployment metrics:
    - Database queries
    - Cache operations
    - External service calls
    - Runtime metrics (CPU, memory)