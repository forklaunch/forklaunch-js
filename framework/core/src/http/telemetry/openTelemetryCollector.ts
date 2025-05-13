import { HyperExpressInstrumentation } from '@forklaunch/opentelemetry-instrumentation-hyper-express';
import {
  Counter,
  Gauge,
  Histogram,
  metrics,
  ObservableCounter,
  ObservableGauge,
  ObservableUpDownCounter,
  UpDownCounter
} from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVICE_NAME
} from '@opentelemetry/semantic-conventions';
import dotenv from 'dotenv';
import { LevelWithSilent, LevelWithSilentOrString } from 'pino';
import { v4 } from 'uuid';
import { getEnvVar } from '../../services/getEnvVar';
import { isForklaunchRequest } from '../guards/isForklaunchRequest';
import {
  LogFn,
  LoggerMeta,
  MetricsDefinition,
  MetricType
} from '../types/openTelemetryCollector.types';
import { ATTR_API_NAME, ATTR_CORRELATION_ID } from './constants';
import { logger } from './pinoLogger';

export class OpenTelemetryCollector<
  AppliedMetricsDefinition extends MetricsDefinition
> {
  private readonly uuid = v4();
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
    this.logger = logger(level || 'info');

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

    this.log(
      'info',
      'OpenTelemetry Collector (Traces + Logs + Metrics) started'
    );
  }

  log(level: LevelWithSilent, ...args: (string | unknown | LoggerMeta)[]) {
    this.logger.log(level, ...args);
  }

  info: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => {
    this.logger.log('info', msg, ...args);
  };

  error: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => {
    this.logger.log('error', msg, ...args);
  };

  warn: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => {
    this.logger.log('warn', msg, ...args);
  };

  debug: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => {
    this.logger.log('debug', msg, ...args);
  };

  trace: LogFn = (
    msg: string | unknown | LoggerMeta,
    ...args: (string | unknown | LoggerMeta)[]
  ) => {
    this.logger.log('trace', msg, ...args);
  };

  getMetric<T extends keyof AppliedMetricsDefinition>(
    metricId: T
  ): MetricType<AppliedMetricsDefinition[T]> {
    return this.metrics[metricId] as MetricType<AppliedMetricsDefinition[T]>;
  }
}

dotenv.config({ path: getEnvVar('ENV_FILE_PATH') });

new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: getEnvVar('OTEL_SERVICE_NAME')
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${
      getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT') ?? 'http://localhost:4318'
    }/v1/traces`
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${
        getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT') ?? 'http://localhost:4318'
      }/v1/metrics`
    }),
    exportIntervalMillis: 5000
  }),
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${
          getEnvVar('OTEL_EXPORTER_OTLP_ENDPOINT') ?? 'http://localhost:4318'
        }/v1/logs`
      })
    )
  ],
  instrumentations: [
    new HttpInstrumentation({
      applyCustomAttributesOnSpan: (span, request) => {
        span.setAttribute(
          'service.name',
          getEnvVar('OTEL_SERVICE_NAME') ?? 'unknown'
        );
        if (isForklaunchRequest(request)) {
          span.setAttribute('api.name', request.contractDetails?.name);
        }
      }
    }),
    new ExpressInstrumentation(),
    new HyperExpressInstrumentation()
  ]
}).start();

// begin static metrics -- these have to be in here in order to instantiate these after the SDK is instantiated
export const httpRequestsTotalCounter = metrics
  .getMeter(getEnvVar('OTEL_SERVICE_NAME') || 'unknown')
  .createCounter<{
    [ATTR_SERVICE_NAME]: string;
    [ATTR_API_NAME]: string;
    [ATTR_CORRELATION_ID]: string;
    [ATTR_HTTP_REQUEST_METHOD]: string;
    [ATTR_HTTP_ROUTE]: string;
    [ATTR_HTTP_RESPONSE_STATUS_CODE]: number;
  }>('http_requests_total', {
    description: 'Number of HTTP requests'
  });

export const httpServerDurationHistogram = metrics
  .getMeter(getEnvVar('OTEL_SERVICE_NAME') || 'unknown')
  .createHistogram<{
    [ATTR_SERVICE_NAME]: string;
    [ATTR_API_NAME]: string;
    [ATTR_HTTP_REQUEST_METHOD]: string;
    [ATTR_HTTP_ROUTE]: string;
    [ATTR_HTTP_RESPONSE_STATUS_CODE]: number;
  }>('http_server_duration', {
    description: 'Duration of HTTP server requests',
    unit: 's'
  });
