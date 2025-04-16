import {
  Counter,
  Gauge,
  Histogram,
  ObservableCounter,
  ObservableGauge,
  ObservableUpDownCounter,
  UpDownCounter
} from '@opentelemetry/api';
import { LevelWithSilentOrString } from 'pino';

export type MetricType<T extends string> = T extends 'counter'
  ? Counter
  : T extends 'gauge'
    ? Gauge
    : T extends 'histogram'
      ? Histogram
      : T extends 'upDownCounter'
        ? UpDownCounter
        : T extends 'observableCounter'
          ? ObservableCounter
          : T extends 'observableGauge'
            ? ObservableGauge
            : T extends 'observableUpDownCounter'
              ? ObservableUpDownCounter
              : undefined;

export type MetricsDefinition = Record<
  string,
  | 'counter'
  | 'gauge'
  | 'histogram'
  | 'upDownCounter'
  | 'observableCounter'
  | 'observableGauge'
  | 'observableUpDownCounter'
>;

export type LoggerMeta = Record<string, unknown> & { _meta: true };

export interface LogFn {
  <T extends object>(
    obj: T | LoggerMeta,
    msg?: string | LoggerMeta,
    ...args: unknown[]
  ): void;
  (
    obj: unknown | LoggerMeta,
    msg?: string | LoggerMeta,
    ...args: unknown[]
  ): void;
  (msg: string | LoggerMeta, ...args: unknown[]): void;
}

export interface TelemetryOptions {
  enabled:
    | boolean
    | {
        metrics?: boolean;
        tracing?: boolean;
        logging?: boolean;
      };
  level: LevelWithSilentOrString;
}
