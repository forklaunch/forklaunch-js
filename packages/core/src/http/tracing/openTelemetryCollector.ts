import { HyperExpressInstrumentation } from '@forklaunch/opentelemetry-instrumentation-hyper-express';
import {
  Counter,
  Gauge,
  Histogram,
  metrics,
  ObservableCounter,
  ObservableGauge,
  ObservableUpDownCounter,
  trace,
  UpDownCounter
} from '@opentelemetry/api';
import { AnyValueMap, logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Resource } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_STATUS_CODE
} from '@opentelemetry/semantic-conventions';
import { LevelWithSilent, LevelWithSilentOrString } from 'pino';
import {
  MetricsDefinition,
  MetricType
} from '../types/openTelemetryCollector.types';
import { pinoLogger } from './pinoLogger';

export class OpenTelemetryCollector<
  AppliedMetricsDefinition extends MetricsDefinition
> {
  private readonly logger;
  private readonly metrics: Record<
    keyof AppliedMetricsDefinition,
    | Counter
    | Gauge
    | Histogram
    | UpDownCounter
    | ObservableCounter
    | ObservableGauge
    | ObservableUpDownCounter
  >;

  // scoped creation and create this in middleware when api execute. Also add correlation id
  constructor(
    private readonly serviceName: string,
    level?: LevelWithSilentOrString,
    metricDefinitions?: AppliedMetricsDefinition
  ) {
    this.logger = pinoLogger(level ?? 'info');

    this.metrics = {} as Record<
      keyof AppliedMetricsDefinition,
      MetricType<AppliedMetricsDefinition[keyof AppliedMetricsDefinition]>
    >;

    for (const [metricId, metricType] of Object.entries(
      metricDefinitions ?? {}
    )) {
      switch (metricType) {
        case 'counter':
          this.metrics[metricId as keyof AppliedMetricsDefinition] = metrics
            .getMeter(this.serviceName)
            .createCounter(metricId);
          break;
        case 'gauge':
          this.metrics[metricId as keyof AppliedMetricsDefinition] = metrics
            .getMeter(this.serviceName)
            .createGauge(metricId);
          break;
        case 'histogram':
          this.metrics[metricId as keyof AppliedMetricsDefinition] = metrics
            .getMeter(this.serviceName)
            .createHistogram(metricId);
          break;
        case 'upDownCounter':
          this.metrics[metricId as keyof AppliedMetricsDefinition] = metrics
            .getMeter(this.serviceName)
            .createUpDownCounter(metricId);
          break;
        case 'observableCounter':
          this.metrics[metricId as keyof AppliedMetricsDefinition] = metrics
            .getMeter(this.serviceName)
            .createObservableCounter(metricId);
          break;
        case 'observableGauge':
          this.metrics[metricId as keyof AppliedMetricsDefinition] = metrics
            .getMeter(this.serviceName)
            .createObservableGauge(metricId);
          break;
        case 'observableUpDownCounter':
          this.metrics[metricId as keyof AppliedMetricsDefinition] = metrics
            .getMeter(this.serviceName)
            .createObservableUpDownCounter(metricId);
          break;
      }
    }

    this.log('info', 'OpenTelemetry (Traces + Logs + Metrics) started');
  }

  log(level: LevelWithSilent, msg: string, meta: AnyValueMap = {}) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const activeSpanContext = activeSpan.spanContext();
      meta.trace_id = activeSpanContext.traceId;
      meta.span_id = activeSpanContext.spanId;
      meta.trace_flags = activeSpanContext.traceFlags;
    }

    if (!meta.api_name) {
      // @ts-expect-error accessing private property
      meta.api_name = activeSpan?.attributes['api.name'] ?? 'undefined';
    }

    this.logger[level](msg);
    logs.getLogger(this.serviceName).emit({
      severityText: level,
      body: msg,
      attributes: meta
    });
  }

  getMetric<T extends keyof AppliedMetricsDefinition>(
    metricId: T
  ): MetricType<AppliedMetricsDefinition[T]> {
    return this.metrics[metricId] as MetricType<AppliedMetricsDefinition[T]>;
  }
}

new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/metrics`
    }),
    exportIntervalMillis: 5000
  }),
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/logs`
      })
    )
  ],
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation({
      requestHook: (span, info) => {
        span.setAttribute(
          'service.name',
          process.env.SERVICE_NAME ?? 'unknown'
        );
        span.setAttribute('api.name', info.request.contractDetails?.name);
      }
    }),
    new HyperExpressInstrumentation()
  ]
}).start();

export const httpRequestsTotalCounter = metrics
  .getMeter(process.env.SERVICE_NAME || 'unknown')
  .createCounter<{
    'service.name': string;
    'api.name': string;
    [SEMATTRS_HTTP_METHOD]: string;
    [SEMATTRS_HTTP_ROUTE]: string;
    [SEMATTRS_HTTP_STATUS_CODE]: number;
  }>('http_requests_total', {
    description: 'Number of HTTP requests'
  });
