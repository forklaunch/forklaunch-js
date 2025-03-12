import { MetricsDefinition } from '../types/openTelemetryCollector.types';

export function metricsDefinitions<T extends MetricsDefinition>(metrics: T) {
  return metrics;
}
